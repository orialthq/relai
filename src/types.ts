// relai data model — the seed of the engine.
// Everything #1 (완료 → 체크 & 알림) needs, designed so #2 (협업 요청 라우터) extends it.

export type TaskStatus = "todo" | "doing" | "done";

export interface OrgNode {
  id: string;
  name: string;
  parentId: string | null; // 노드 안의 노드
}

export interface Member {
  id: string;
  name: string;
  nodeId: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface Checklist {
  id: string;
  name: string; // = "회의록" 역할
  nodeId: string;
  items: ChecklistItem[];
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId: string; // 담당자 (Member.id)
  nodeId: string; // 소속 노드
  link?: { checklistId: string; itemId: string }; // checkoff 대상
}

export interface Notification {
  id: string;
  toMemberId: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
}

export interface LogEntry {
  id: string;
  ts: number;
  planName: string;
  taskTitle: string;
  nodeName: string;
  steps: string[]; // 실행된 스텝의 사람 읽기용 설명
}

export type Trigger =
  | { type: "taskStatusChange"; to: TaskStatus }
  | { type: "webhook"; event: string };

export type Step =
  | { type: "checkoff"; target: "task.link" }
  | { type: "notify"; to: ("assignee" | "node")[]; channel: "inapp" };

export interface ActionPlan {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  steps: Step[];
  requires: { llm: boolean; mcp: boolean }; // #1은 둘 다 false → 키 없이 동작
}

export interface AppState {
  org: OrgNode[];
  members: Member[];
  tasks: Task[];
  checklists: Checklist[];
  plans: ActionPlan[];
  notifications: Notification[];
  log: LogEntry[];
}
