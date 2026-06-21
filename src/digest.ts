import type { AppState } from "./types";

/**
 * Turns the current workspace into a compact text snapshot of recent activity,
 * grouped by node — the input to the standup-digest LLM call.
 */
export function buildActivitySnapshot(state: AppState, scopeNodeId: string | null): string {
  const nodes = state.org.filter(
    (n) => n.parentId !== null && (scopeNodeId === null || n.id === scopeNodeId)
  );

  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? "미배정";

  const lines: string[] = [];
  for (const node of nodes) {
    const tasks = state.tasks.filter((t) => t.nodeId === node.id);
    const done = tasks.filter((t) => t.status === "done");
    const doing = tasks.filter((t) => t.status === "doing");
    const todo = tasks.filter((t) => t.status === "todo");

    lines.push(`[${node.name}]`);
    lines.push(`완료: ${done.map((t) => `${t.title}(${memberName(t.assigneeId)})`).join(", ") || "없음"}`);
    lines.push(`진행 중: ${doing.map((t) => `${t.title}(${memberName(t.assigneeId)})`).join(", ") || "없음"}`);
    lines.push(`대기: ${todo.map((t) => `${t.title}(${memberName(t.assigneeId)})`).join(", ") || "없음"}`);
    lines.push("");
  }

  const recentRelays = state.log
    .slice(0, 6)
    .map((e) => `${e.planName} · ${e.nodeName} › ${e.taskTitle}`);
  if (recentRelays.length > 0) {
    lines.push("최근 자동화 발화:");
    recentRelays.forEach((r) => lines.push(`- ${r}`));
  }

  return lines.join("\n").trim();
}
