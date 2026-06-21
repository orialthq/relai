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

export interface CollabRunResult {
  tasks: AppState["tasks"];
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

/**
 * The router. When a collaboration request (node A → node B) is accepted,
 * every enabled plan triggered by `collabAccepted` fires against the request's
 * context: a task is created and assigned inside the receiving node, a matching
 * checklist item is opened, and both nodes are notified.
 */
export function runPlansForCollabAccepted(state: AppState, requestId: string): CollabRunResult {
  const empty: CollabRunResult = {
    tasks: state.tasks,
    checklists: state.checklists,
    notifications: [],
    log: [],
    fired: [],
  };

  const req = state.collabRequests.find((r) => r.id === requestId);
  if (!req) return empty;

  const fromNode = state.org.find((n) => n.id === req.fromNodeId);
  const toNode = state.org.find((n) => n.id === req.toNodeId);

  const plans = state.plans.filter(
    (p) => p.enabled && p.trigger.type === "collabAccepted"
  );
  if (plans.length === 0) return empty;

  let tasks = state.tasks;
  let checklists = state.checklists;
  const newNotifications: Notification[] = [];
  const newLog: LogEntry[] = [];
  const fired: FireResult[] = [];

  for (const plan of plans) {
    const steps: string[] = [];
    const planNotifications: Notification[] = [];
    let createdTitle: string | undefined;

    for (const step of plan.steps) {
      if (step.type === "createTask") {
        const toMembers = state.members.filter((m) => m.nodeId === req.toNodeId);
        const assignee = toMembers[0];

        // open a checklist item in the receiving node (create the checklist if missing)
        const item = { id: uid("ci"), label: req.title, checked: false };
        const existing = checklists.find((c) => c.nodeId === req.toNodeId);
        let checklistId: string;
        if (existing) {
          checklistId = existing.id;
          checklists = checklists.map((c) =>
            c.id === existing.id ? { ...c, items: [...c.items, item] } : c
          );
        } else {
          checklistId = uid("cl");
          checklists = [
            ...checklists,
            { id: checklistId, name: `${toNode?.name ?? "팀"} 회의록`, nodeId: req.toNodeId, items: [item] },
          ];
        }

        tasks = [
          ...tasks,
          {
            id: uid("t"),
            title: req.title,
            status: step.status,
            assigneeId: assignee?.id ?? "",
            nodeId: req.toNodeId,
            link: { checklistId, itemId: item.id },
          },
        ];
        createdTitle = req.title;
        steps.push(
          `작업 생성: ${toNode?.name ?? "팀"} › ${req.title}${assignee ? ` (담당 ${assignee.name})` : ""}`
        );
      }

      if (step.type === "notify") {
        const recipientIds = new Set<string>();
        if (step.to.includes("toNode"))
          state.members.filter((m) => m.nodeId === req.toNodeId).forEach((m) => recipientIds.add(m.id));
        if (step.to.includes("fromNode"))
          state.members.filter((m) => m.nodeId === req.fromNodeId).forEach((m) => recipientIds.add(m.id));

        for (const memberId of recipientIds) {
          planNotifications.push({
            id: uid("ntf"),
            toMemberId: memberId,
            title: `협업 수락: ${req.title}`,
            body: `${fromNode?.name ?? "?"} → ${toNode?.name ?? "?"} 협업이 수락됐어요. "${req.title}" 작업이 생성됐습니다.`,
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
      taskTitle: createdTitle ?? req.title,
      nodeName: `${fromNode?.name ?? "?"} → ${toNode?.name ?? "?"}`,
      steps,
    };

    newNotifications.push(...planNotifications);
    newLog.push(logEntry);
    fired.push({ planName: plan.name, logEntry, notifications: planNotifications });
  }

  return { tasks, checklists, notifications: newNotifications, log: newLog, fired };
}

/**
 * Applies LLM-extracted action items into a node: each becomes a task assigned to
 * the matched member (by name, falling back to the node's first member), with a
 * matching checklist item opened. Sync — the async LLM call happens before this.
 */
export function applyActionItems(
  state: AppState,
  nodeId: string,
  items: { title: string; owner: string | null }[]
): CollabRunResult {
  const node = state.org.find((n) => n.id === nodeId);
  const members = state.members.filter((m) => m.nodeId === nodeId);

  let tasks = state.tasks;
  let checklists = state.checklists;
  const notifications: Notification[] = [];
  const steps: string[] = [];

  for (const it of items) {
    const owner = members.find((m) => m.name === it.owner) ?? members[0];

    const item = { id: uid("ci"), label: it.title, checked: false };
    const existing = checklists.find((c) => c.nodeId === nodeId);
    let checklistId: string;
    if (existing) {
      checklistId = existing.id;
      checklists = checklists.map((c) =>
        c.id === existing.id ? { ...c, items: [...c.items, item] } : c
      );
    } else {
      checklistId = uid("cl");
      checklists = [
        ...checklists,
        { id: checklistId, name: `${node?.name ?? "팀"} 회의록`, nodeId, items: [item] },
      ];
    }

    tasks = [
      ...tasks,
      {
        id: uid("t"),
        title: it.title,
        status: "todo",
        assigneeId: owner?.id ?? "",
        nodeId,
        link: { checklistId, itemId: item.id },
      },
    ];

    if (owner) {
      notifications.push({
        id: uid("ntf"),
        toMemberId: owner.id,
        title: `새 액션아이템: ${it.title}`,
        body: `${node?.name ?? "팀"} 회의록에서 "${it.title}" 작업이 배정됐어요.`,
        ts: Date.now(),
        read: false,
      });
    }
    steps.push(`작업 생성: ${it.title}${owner ? ` (담당 ${owner.name})` : ""}`);
  }

  const logEntry: LogEntry = {
    id: uid("log"),
    ts: Date.now(),
    planName: "노트 → 액션아이템",
    taskTitle: `${items.length}개 추출`,
    nodeName: node?.name ?? "—",
    steps,
  };

  return {
    tasks,
    checklists,
    notifications,
    log: [logEntry],
    fired: [{ planName: "노트 → 액션아이템", logEntry, notifications }],
  };
}
