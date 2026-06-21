import type { Provider } from "./settings";

export interface ExtractInput {
  provider: Provider;
  apiKey: string;
  model: string;
  notes: string;
  memberNames: string[];
}

export interface ActionItem {
  title: string;
  owner: string | null;
}

export interface ExtractResult {
  decisions: string[];
  actionItems: ActionItem[];
}

const SYSTEM =
  "너는 회의록에서 결정사항(decisions)과 액션아이템(action items)을 뽑아내는 도우미야. " +
  "반드시 JSON만 출력하고, 코드펜스나 다른 설명은 붙이지 마.";

function userPrompt(notes: string, memberNames: string[]): string {
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

function parseResult(text: string): ExtractResult {
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
  const prompt = userPrompt(input.notes, input.memberNames);

  if (input.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
        // required to allow the request straight from the browser with the user's own key
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status} — ${await res.text()}`);
    const data = await res.json();
    const text: string = Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text ?? "").join("")
      : "";
    return parseResult(text);
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
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status} — ${await res.text()}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  return parseResult(text);
}
