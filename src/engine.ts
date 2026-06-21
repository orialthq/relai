import type { AppState, Checklist, LogEntry, Notification } from "./types";

let counter = 0;
const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export interface FireResult {
  planName: string;
  logEntry: LogEntry;
  notifications: Notification[];
  checkedLabel?: string;
}

export interface RunResult {
  checklists: Checklist[];
  notifications: Notification[];
  log: LogEntry[];
  fired: FireResult[];
}

/**
 * The relay. When a task moves to `done`, every enabled plan whose trigger is
 * `taskStatusChange → done` fires: its steps run in order against the task's context.
 * Pure function — returns the pieces of state to merge, never mutates input.
 */
export function runPlansForTaskDone(state: AppState, taskId: string): RunResult {
  const empty: RunResult = {
    checklists: state.checklists,
    notifications: [],
    log: [],
    fired: [],
  };

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return empty;

  const node = state.org.find((n) => n.id === task.nodeId);
  const assignee = state.members.find((m) => m.id === task.assigneeId);

  const plans = state.plans.filter(
    (p) => p.enabled && p.trigger.type === "taskStatusChange" && p.trigger.to === "done"
  );
  if (plans.length === 0) return empty;

  let checklists = state.checklists;
  const newNotifications: Notification[] = [];
  const newLog: LogEntry[] = [];
  const fired: FireResult[] = [];

  for (const plan of plans) {
    const steps: string[] = [];
    const planNotifications: Notification[] = [];
    let checkedLabel: string | undefined;

    for (const step of plan.steps) {
      if (step.type === "checkoff" && task.link) {
        const { checklistId, itemId } = task.link;
        checklists = checklists.map((cl) =>
          cl.id !== checklistId
            ? cl
            : {
                ...cl,
                items: cl.items.map((it) =>
                  it.id === itemId ? { ...it, checked: true } : it
                ),
              }
        );
        const cl = checklists.find((c) => c.id === checklistId);
        const item = cl?.items.find((i) => i.id === itemId);
        checkedLabel = item?.label;
        steps.push(`체크: ${cl?.name ?? "회의록"} › ${item?.label ?? itemId}`);
      }

      if (step.type === "notify") {
        const recipientIds = new Set<string>();
        if (step.to.includes("assignee") && assignee) recipientIds.add(assignee.id);
        if (step.to.includes("node")) {
          state.members
            .filter((m) => m.nodeId === task.nodeId)
            .forEach((m) => recipientIds.add(m.id));
        }
        for (const memberId of recipientIds) {
          planNotifications.push({
            id: uid("ntf"),
            toMemberId: memberId,
            title: `${task.title} 완료`,
            body: `${node?.name ?? "노드"}의 "${task.title}"가 완료됐어요${
              checkedLabel ? ` · 회의록 체크됨` : ""
            }.`,
            ts: Date.now(),
            read: false,
          });
        }
        const names = [...recipientIds]
          .map((id) => state.members.find((m) => m.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        steps.push(`알림: ${names || "대상 없음"}`);
      }
    }

    const logEntry: LogEntry = {
      id: uid("log"),
      ts: Date.now(),
      planName: plan.name,
      taskTitle: task.title,
      nodeName: node?.name ?? "—",
      steps,
    };

    newNotifications.push(...planNotifications);
    newLog.push(logEntry);
    fired.push({ planName: plan.name, logEntry, notifications: planNotifications, checkedLabel });
  }

  return { checklists, notifications: newNotifications, log: newLog, fired };
}
