import type { Provider } from "./settings";

export interface ActionItem {
  title: string;
  owner: string | null;
}

export interface ExtractResult {
  decisions: string[];
  actionItems: ActionItem[];
}

interface CallInput {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  jsonMode?: boolean;
}

/** Shared browser-side BYOK call. Returns the model's text output. */
async function callLLM(input: CallInput): Promise<string> {
  if (input.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
        // allows the request straight from the browser with the user's own key
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1024,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status} — ${await res.text()}`);
    const data = await res.json();
    return Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text ?? "").join("")
      : "";
  }

  // openai
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      ...(input.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status} — ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ---------- #3 노트 → 액션아이템 ----------

export interface ExtractInput {
  provider: Provider;
  apiKey: string;
  model: string;
  notes: string;
  memberNames: string[];
}

const EXTRACT_SYSTEM =
  "너는 회의록에서 결정사항(decisions)과 액션아이템(action items)을 뽑아내는 도우미야. " +
  "반드시 JSON만 출력하고, 코드펜스나 다른 설명은 붙이지 마.";

function extractPrompt(notes: string, memberNames: string[]): string {
  return [
    "다음 회의록을 분석해서 아래 형식의 JSON만 출력해.",
    `팀 멤버: ${memberNames.length ? memberNames.join(", ") : "(없음)"}`,
    'JSON 형식: {"decisions": string[], "actionItems": [{"title": string, "owner": string|null}]}',
    "- title은 누가 봐도 실행 가능한 한 줄짜리 작업으로 적어.",
    "- owner는 위 멤버 이름 중 정확히 하나거나, 불명확하면 null.",
    "",
    "회의록:",
    '"""',
    notes,
    '"""',
  ].join("\n");
}

function parseExtract(text: string): ExtractResult {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean) as Partial<ExtractResult>;
  return {
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter((d) => typeof d === "string") : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .filter((a): a is ActionItem => !!a && typeof a.title === "string")
          .map((a) => ({ title: a.title, owner: typeof a.owner === "string" ? a.owner : null }))
      : [],
  };
}

export async function extractActionItems(input: ExtractInput): Promise<ExtractResult> {
  const text = await callLLM({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    system: EXTRACT_SYSTEM,
    user: extractPrompt(input.notes, input.memberNames),
    jsonMode: true,
  });
  return parseExtract(text);
}

// ---------- #4 스탠드업 다이제스트 ----------

export interface DigestInput {
  provider: Provider;
  apiKey: string;
  model: string;
  activity: string;
}

const DIGEST_SYSTEM =
  "너는 작은 스타트업 팀의 스탠드업 다이제스트를 작성하는 도우미야. 간결한 한국어로, 군더더기 없이 정리해.";

function digestPrompt(activity: string): string {
  return [
    "다음 작업 현황을 바탕으로 팀 스탠드업 다이제스트를 작성해.",
    "형식:",
    "- 팀별로 '✅ 완료 / 🔄 진행 중 / ⏭ 다음' 을 짧게.",
    "- 맨 마지막에 '한 줄 총평' 한 줄.",
    "- 마크다운 헤더(#)는 쓰지 말고, 팀 이름은 굵게(**팀명**) 정도만.",
    "",
    "작업 현황:",
    activity,
  ].join("\n");
}

export async function generateDigest(input: DigestInput): Promise<string> {
  const text = await callLLM({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    system: DIGEST_SYSTEM,
    user: digestPrompt(input.activity),
  });
  return text.trim();
}

// ---------- #5 인바운드 → 태스크 ----------

export type Priority = "high" | "normal" | "low";

export interface TriageResult {
  node: string;
  priority: Priority;
  summary: string;
  suggestedChannel: string;
  draftReply: string;
}

export interface TriageInput {
  provider: Provider;
  apiKey: string;
  model: string;
  text: string;
  sourceType: string;
  nodeNames: string[];
}

const TRIAGE_SYSTEM =
  "너는 들어온 메시지를 분류해서 올바른 팀의 작업으로 만드는 트리아지 도우미야. 반드시 JSON만 출력해.";

function triagePrompt(text: string, sourceType: string, nodeNames: string[]): string {
  return [
    "다음 인바운드 메시지를 분석해서 아래 형식의 JSON만 출력해.",
    `소스 유형: ${sourceType}`,
    `담당 가능 팀: ${nodeNames.join(", ")}`,
    'JSON 형식: {"node": string, "priority": "high"|"normal"|"low", "summary": string, "suggestedChannel": string, "draftReply": string}',
    "- node는 위 팀 중 정확히 하나.",
    "- summary는 한 줄 작업 제목.",
    "- suggestedChannel은 회신을 보낼 채널 (ex. Gmail 회신, Slack #support, Notion 태스크).",
    "- draftReply는 2~3문장 한국어 회신 초안.",
    "",
    "메시지:",
    '"""',
    text,
    '"""',
  ].join("\n");
}

export async function triageInbound(input: TriageInput): Promise<TriageResult> {
  const out = await callLLM({
    provider: input.provider,
    apiKey: input.apiKey,
    model: input.model,
    system: TRIAGE_SYSTEM,
    user: triagePrompt(input.text, input.sourceType, input.nodeNames),
    jsonMode: true,
  });
  const clean = out.replace(/```json/gi, "").replace(/```/g, "").trim();
  const p = JSON.parse(clean) as Partial<TriageResult>;
  const priority: Priority = p.priority === "high" || p.priority === "low" ? p.priority : "normal";
  return {
    node: typeof p.node === "string" ? p.node : "",
    priority,
    summary: typeof p.summary === "string" ? p.summary : "분류된 작업",
    suggestedChannel: typeof p.suggestedChannel === "string" ? p.suggestedChannel : "Gmail 회신",
    draftReply: typeof p.draftReply === "string" ? p.draftReply : "",
  };
}
