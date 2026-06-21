import type { AppState, TaskStatus } from "../types";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "할 일" },
  { key: "doing", label: "진행 중" },
  { key: "done", label: "완료" },
];

export function TaskBoard({
  state,
  onSetStatus,
}: {
  state: AppState;
  onSetStatus: (taskId: string, status: TaskStatus) => void;
}) {
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? "—";
  const nodeName = (id: string) => state.org.find((n) => n.id === id)?.name ?? "—";

  return (
    <section className="panel panel--tasks">
      <header className="panel-head">
        <h2 className="panel-title">작업</h2>
        <span className="panel-tag">완료로 옮기면 relay가 발화한다</span>
      </header>
      <div className="board">
        {COLUMNS.map((col) => {
          const tasks = state.tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="board-col">
              <div className="board-col-head">
                <span>{col.label}</span>
                <span className="board-count">{tasks.length}</span>
              </div>
              <div className="board-col-body">
                {tasks.length === 0 && <p className="board-empty">비어 있음</p>}
                {tasks.map((t) => (
                  <article key={t.id} className={`card card--${t.status}`}>
                    <h3 className="card-title">{t.title}</h3>
                    <div className="card-meta">
                      <span className="chip chip--node">{nodeName(t.nodeId)}</span>
                      <span className="card-assignee">{memberName(t.assigneeId)}</span>
                    </div>
                    {t.status !== "done" ? (
                      <div className="card-actions">
                        {t.status === "todo" && (
                          <button className="btn btn--ghost" onClick={() => onSetStatus(t.id, "doing")}>
                            진행
                          </button>
                        )}
                        <button className="btn btn--primary" onClick={() => onSetStatus(t.id, "done")}>
                          완료 →
                        </button>
                      </div>
                    ) : (
                      <div className="card-done-mark">✓ 완료 · relay 발화됨</div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
