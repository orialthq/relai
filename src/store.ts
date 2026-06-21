import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState } from "./types";
import { applyActionItems, applyInbound, runPlansForCollabAccepted, runPlansForTaskDone } from "./engine";
import { extractActionItems, generateDigest, triageInbound } from "./llm";
import { buildActivitySnapshot } from "./digest";
import { loadSettings } from "./settings";

const STORAGE_KEY = "relai.state.v2";

let sid = 0;
const newId = (p: string) => `${p}_${Date.now().toString(36)}_${(sid++).toString(36)}`;

export function seedState(): AppState {
  return {
    org: [
      { id: "n_root", name: "OriAlt", parentId: null },
      { id: "n_prod", name: "Product", parentId: "n_root" },
      { id: "n_mkt", name: "Marketing", parentId: "n_root" },
    ],
    members: [
      { id: "m_iq", name: "IQ", nodeId: "n_prod" },
      { id: "m_jh", name: "준학", nodeId: "n_prod" },
      { id: "m_da", name: "다은", nodeId: "n_mkt" },
    ],
    checklists: [
      {
        id: "cl_prod",
        name: "제품 회의록",
        nodeId: "n_prod",
        items: [
          { id: "ci_login", label: "로그인 API 테스트 통과", checked: false },
          { id: "ci_onboard", label: "온보딩 플로우 확정", checked: false },
        ],
      },
      {
        id: "cl_mkt",
        name: "마케팅 회의록",
        nodeId: "n_mkt",
        items: [{ id: "ci_copy", label: "랜딩 카피 확정", checked: false }],
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "로그인 API 테스트",
        status: "doing",
        assigneeId: "m_iq",
        nodeId: "n_prod",
        link: { checklistId: "cl_prod", itemId: "ci_login" },
      },
      {
        id: "t2",
        title: "온보딩 플로우 설계",
        status: "todo",
        assigneeId: "m_jh",
        nodeId: "n_prod",
        link: { checklistId: "cl_prod", itemId: "ci_onboard" },
      },
      {
        id: "t3",
        title: "랜딩 카피 검수",
        status: "doing",
        assigneeId: "m_da",
        nodeId: "n_mkt",
        link: { checklistId: "cl_mkt", itemId: "ci_copy" },
      },
    ],
    plans: [
      {
        id: "ap_done_notify",
        name: "완료 → 체크 & 알림",
        enabled: true,
        trigger: { type: "taskStatusChange", to: "done" },
        steps: [
          { type: "checkoff", target: "task.link" },
          { type: "notify", to: ["assignee", "node"], channel: "inapp" },
        ],
        requires: { llm: false, mcp: false },
      },
      {
        id: "ap_collab_route",
        name: "협업 수락 → 작업 생성 & 배정",
        enabled: true,
        trigger: { type: "collabAccepted" },
        steps: [
          { type: "createTask", assignTo: "node.firstMember", status: "todo" },
          { type: "notify", to: ["toNode", "fromNode"], channel: "inapp" },
        ],
        requires: { llm: false, mcp: false },
      },
      {
        id: "ap_notes_extract",
        name: "노트 → 액션아이템",
        enabled: true,
        trigger: { type: "manual" },
        steps: [
          { type: "extract", via: "llm" },
          { type: "createTask", assignTo: "node.firstMember", status: "todo" },
          { type: "notify", to: ["assignee"], channel: "inapp" },
        ],
        requires: { llm: true, mcp: false },
      },
      {
        id: "ap_standup_digest",
        name: "스탠드업 다이제스트",
        enabled: true,
        trigger: { type: "schedule", every: "day" },
        steps: [
          { type: "summarize", via: "llm" },
          { type: "notify", to: ["all"], channel: "inapp" },
        ],
        requires: { llm: true, mcp: false },
      },
      {
        id: "ap_inbound_task",
        name: "인바운드 → 태스크",
        enabled: true,
        trigger: { type: "webhook", event: "inbound.received" },
        steps: [
          { type: "classify", via: "llm" },
          { type: "createTask", assignTo: "node.firstMember", status: "todo" },
          { type: "notify", to: ["assignee"], channel: "inapp" },
          { type: "deliver", via: "mcp", to: "Gmail / Slack" },
        ],
        requires: { llm: true, mcp: true },
      },
    ],
    collabRequests: [
      {
        id: "cr_seed",
        fromNodeId: "n_prod",
        toNodeId: "n_mkt",
        title: "런칭 카피 작성",
        note: "톤은 임팩트 있게, 1줄 헤드라인 + 3줄 서브",
        actionPlanId: "ap_collab_route",
        status: "pending",
        createdTs: Date.now(),
      },
    ],
    notifications: [],
    log: [],
    digests: [],
    inbounds: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.tasks || !parsed.plans) return seedState();
    const merged = { ...seedState(), ...parsed }; // backfill any newly-added keys
    // surface newly-shipped seed plans (by id) without wiping the user's workspace
    const haveIds = new Set(merged.plans.map((p) => p.id));
    const missing = seedState().plans.filter((p) => !haveIds.has(p.id));
    if (missing.length) merged.plans = [...merged.plans, ...missing];
    return merged;
  } catch {
    return seedState();
  }
}

export interface FiredToast {
  id: string;
  planName: string;
  taskTitle: string;
  notifiedCount: number;
  checkedLabel?: string;
}

export function useRelaiStore() {
  const [state, setState] = useState<AppState>(load);
  const [toasts, setToasts] = useState<FiredToast[]>([]);
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [notesResult, setNotesResult] = useState<import("./llm").ExtractResult | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [inboundBusy, setInboundBusy] = useState(false);
  const [inboundError, setInboundError] = useState<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setStatus = useCallback((taskId: string, status: AppState["tasks"][number]["status"]) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task || task.status === status) return prev;
      const tasks = prev.tasks.map((t) => (t.id === taskId ? { ...t, status } : t));

      // Only "→ done" fires the engine in this MVP.
      if (status !== "done") return { ...prev, tasks };

      const result = runPlansForTaskDone({ ...prev, tasks }, taskId);
      if (result.fired.length > 0) {
        const newToasts: FiredToast[] = result.fired.map((f) => ({
          id: `toast_${f.logEntry.id}`,
          planName: f.planName,
          taskTitle: task.title,
          notifiedCount: f.notifications.length,
          checkedLabel: f.checkedLabel,
        }));
        setTimeout(() => setToasts((prev2) => [...prev2, ...newToasts]), 0);
      }

      return {
        ...prev,
        tasks,
        checklists: result.checklists,
        notifications: [...result.notifications, ...prev.notifications],
        log: [...result.log, ...prev.log],
      };
    });
  }, []);

  const togglePlan = useCallback((planId: string) => {
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === planId ? { ...p, enabled: !p.enabled } : p)),
    }));
  }, []);

  const createCollabRequest = useCallback(
    (input: { fromNodeId: string; toNodeId: string; title: string; note: string }) => {
      setState((prev) => ({
        ...prev,
        collabRequests: [
          {
            id: newId("cr"),
            fromNodeId: input.fromNodeId,
            toNodeId: input.toNodeId,
            title: input.title.trim(),
            note: input.note.trim(),
            actionPlanId: "ap_collab_route",
            status: "pending",
            createdTs: Date.now(),
          },
          ...prev.collabRequests,
        ],
      }));
    },
    []
  );

  const resolveCollabRequest = useCallback((id: string, accept: boolean) => {
    setState((prev) => {
      const req = prev.collabRequests.find((r) => r.id === id);
      if (!req || req.status !== "pending") return prev;
      const collabRequests = prev.collabRequests.map((r) =>
        r.id === id ? { ...r, status: accept ? ("accepted" as const) : ("declined" as const), resolvedTs: Date.now() } : r
      );
      if (!accept) return { ...prev, collabRequests };

      const result = runPlansForCollabAccepted({ ...prev, collabRequests }, id);
      if (result.fired.length > 0) {
        const newToasts: FiredToast[] = result.fired.map((f) => ({
          id: `toast_${f.logEntry.id}`,
          planName: f.planName,
          taskTitle: req.title,
          notifiedCount: f.notifications.length,
        }));
        setTimeout(() => setToasts((prev2) => [...prev2, ...newToasts]), 0);
      }

      return {
        ...prev,
        collabRequests,
        tasks: result.tasks,
        checklists: result.checklists,
        notifications: [...result.notifications, ...prev.notifications],
        log: [...result.log, ...prev.log],
      };
    });
  }, []);

  const analyzeNotes = useCallback(async (nodeId: string, notes: string) => {
    const settings = loadSettings();
    if (!settings.apiKey) {
      setLlmError("먼저 LLM 키를 저장하세요.");
      return;
    }
    if (!notes.trim()) return;

    setLlmBusy(true);
    setLlmError(null);
    setNotesResult(null);
    try {
      const memberNames = stateRef.current.members
        .filter((m) => m.nodeId === nodeId)
        .map((m) => m.name);

      const result = await extractActionItems({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        notes,
        memberNames,
      });
      setNotesResult(result);

      if (result.actionItems.length > 0) {
        setState((prev) => {
          const applied = applyActionItems(prev, nodeId, result.actionItems);
          const logId = applied.log[0]?.id ?? Date.now().toString();
          setTimeout(
            () =>
              setToasts((t) => [
                ...t,
                {
                  id: `toast_${logId}`,
                  planName: "노트 → 액션아이템",
                  taskTitle: `${result.actionItems.length}개 생성`,
                  notifiedCount: applied.notifications.length,
                },
              ]),
            0
          );
          return {
            ...prev,
            tasks: applied.tasks,
            checklists: applied.checklists,
            notifications: [...applied.notifications, ...prev.notifications],
            log: [...applied.log, ...prev.log],
          };
        });
      }
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : String(e));
    } finally {
      setLlmBusy(false);
    }
  }, []);

  const generateStandupDigest = useCallback(async (scopeNodeId: string | null) => {
    const settings = loadSettings();
    if (!settings.apiKey) {
      setDigestError("먼저 LLM 키를 저장하세요 (노트 패널에서).");
      return;
    }
    setDigestBusy(true);
    setDigestError(null);
    try {
      const snapshot = buildActivitySnapshot(stateRef.current, scopeNodeId);
      const content = await generateDigest({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        activity: snapshot,
      });
      const scopeLabel = scopeNodeId
        ? stateRef.current.org.find((n) => n.id === scopeNodeId)?.name ?? "팀"
        : "전체";

      setState((prev) => {
        const id = newId("dg");
        const digest = { id, ts: Date.now(), scopeLabel, content };
        const notifications = prev.members.map((m) => ({
          id: newId("ntf"),
          toMemberId: m.id,
          title: "새 다이제스트",
          body: `${scopeLabel} 스탠드업 다이제스트가 생성됐어요.`,
          ts: Date.now(),
          read: false,
        }));
        const logEntry = {
          id: newId("log"),
          ts: Date.now(),
          planName: "스탠드업 다이제스트",
          taskTitle: `${scopeLabel} 요약`,
          nodeName: scopeLabel,
          steps: ["다이제스트 생성", `알림: 전체 ${prev.members.length}명`],
        };
        setTimeout(
          () =>
            setToasts((t) => [
              ...t,
              {
                id: `toast_${id}`,
                planName: "스탠드업 다이제스트",
                taskTitle: `${scopeLabel} 요약`,
                notifiedCount: notifications.length,
              },
            ]),
          0
        );
        return {
          ...prev,
          digests: [digest, ...prev.digests],
          notifications: [...notifications, ...prev.notifications],
          log: [logEntry, ...prev.log],
        };
      });
    } catch (e) {
      setDigestError(e instanceof Error ? e.message : String(e));
    } finally {
      setDigestBusy(false);
    }
  }, []);

  const processInbound = useCallback(async (text: string, sourceType: string) => {
    const settings = loadSettings();
    if (!settings.apiKey) {
      setInboundError("먼저 LLM 키를 저장하세요 (노트 패널에서).");
      return;
    }
    if (!text.trim()) return;

    setInboundBusy(true);
    setInboundError(null);
    try {
      const nodeNames = stateRef.current.org
        .filter((n) => n.parentId !== null)
        .map((n) => n.name);

      const triage = await triageInbound({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        text,
        sourceType,
        nodeNames,
      });

      setState((prev) => {
        const applied = applyInbound(prev, triage, sourceType);
        const logId = applied.log[0]?.id ?? Date.now().toString();
        setTimeout(
          () =>
            setToasts((t) => [
              ...t,
              {
                id: `toast_${logId}`,
                planName: "인바운드 → 태스크",
                taskTitle: triage.summary,
                notifiedCount: applied.notifications.length,
              },
            ]),
          0
        );
        return {
          ...prev,
          tasks: applied.tasks,
          checklists: applied.checklists,
          inbounds: applied.inbounds,
          notifications: [...applied.notifications, ...prev.notifications],
          log: [...applied.log, ...prev.log],
        };
      });
    } catch (e) {
      setInboundError(e instanceof Error ? e.message : String(e));
    } finally {
      setInboundBusy(false);
    }
  }, []);

  const markAllRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const reset = useCallback(() => {
    setState(seedState());
    setToasts([]);
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relai-workspace.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (parsed.tasks && parsed.plans) setState(parsed);
      } catch {
        // ignore malformed import — UI keeps current state
      }
    };
    reader.readAsText(file);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    state,
    toasts,
    llmBusy,
    llmError,
    notesResult,
    digestBusy,
    digestError,
    inboundBusy,
    inboundError,
    setStatus,
    togglePlan,
    createCollabRequest,
    resolveCollabRequest,
    analyzeNotes,
    generateStandupDigest,
    processInbound,
    markAllRead,
    reset,
    exportJson,
    importJson,
    dismissToast,
  };
}
