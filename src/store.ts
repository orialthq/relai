import { useCallback, useEffect, useState } from "react";
import type { AppState } from "./types";
import { runPlansForTaskDone } from "./engine";

const STORAGE_KEY = "relai.state.v1";

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
    ],
    notifications: [],
    log: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.tasks || !parsed.plans) return seedState();
    return parsed;
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
    setStatus,
    togglePlan,
    markAllRead,
    reset,
    exportJson,
    importJson,
    dismissToast,
  };
}
