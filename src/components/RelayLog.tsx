import type { AppState } from "../types";

function timeStr(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function RelayLog({ state }: { state: AppState }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">릴레이 로그</h2>
        <span className="panel-tag">발화 기록</span>
      </header>
      <div className="log">
        {state.log.length === 0 && (
          <p className="log-empty">아직 발화된 릴레이가 없어요. 작업을 완료로 옮겨보세요.</p>
        )}
        {state.log.map((e) => (
          <div key={e.id} className="log-entry">
            <div className="log-line">
              <span className="log-time">{timeStr(e.ts)}</span>
              <span className="log-fire">FIRE</span>
              <span className="log-plan">{e.planName}</span>
            </div>
            <div className="log-ctx">
              {e.nodeName} › {e.taskTitle}
            </div>
            {e.steps.map((s, i) => (
              <div key={i} className="log-step">
                <span className="log-step-mark">└</span> {s}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Notifications({
  state,
  onMarkAllRead,
}: {
  state: AppState;
  onMarkAllRead: () => void;
}) {
  const memberName = (id: string) => state.members.find((m) => m.id === id)?.name ?? "—";
  const unread = state.notifications.filter((n) => !n.read).length;

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">
          알림
          {unread > 0 && <span className="badge">{unread}</span>}
        </h2>
        {state.notifications.length > 0 && (
          <button className="link-btn" onClick={onMarkAllRead}>
            모두 읽음
          </button>
        )}
      </header>
      <div className="notifs">
        {state.notifications.length === 0 && (
          <p className="log-empty">받은 알림이 없어요.</p>
        )}
        {state.notifications.slice(0, 12).map((n) => (
          <div key={n.id} className={`notif ${n.read ? "notif--read" : ""}`}>
            <div className="notif-to">→ {memberName(n.toMemberId)}</div>
            <div className="notif-body">{n.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
