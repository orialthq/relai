import { useState } from "react";
import type { AppState } from "../types";

export function CollabPanel({
  state,
  onCreate,
  onResolve,
}: {
  state: AppState;
  onCreate: (input: { fromNodeId: string; toNodeId: string; title: string; note: string }) => void;
  onResolve: (id: string, accept: boolean) => void;
}) {
  const nodes = state.org.filter((n) => n.parentId !== null);
  const [fromNodeId, setFromNodeId] = useState(nodes[0]?.id ?? "");
  const [toNodeId, setToNodeId] = useState(nodes[1]?.id ?? nodes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const nodeName = (id: string) => state.org.find((n) => n.id === id)?.name ?? "—";
  const planName = (id: string) => state.plans.find((p) => p.id === id)?.name ?? id;

  const valid = title.trim().length > 0 && fromNodeId !== toNodeId;

  const submit = () => {
    if (!valid) return;
    onCreate({ fromNodeId, toNodeId, title, note });
    setTitle("");
    setNote("");
  };

  const pending = state.collabRequests.filter((r) => r.status === "pending");
  const resolved = state.collabRequests.filter((r) => r.status !== "pending").slice(0, 4);

  return (
    <section className="panel panel--collab">
      <header className="panel-head">
        <h2 className="panel-title">협업 요청</h2>
        <span className="panel-tag">노드 → 노드 · 수락 시 발화</span>
      </header>

      <div className="collab-form">
        <div className="collab-route-row">
          <select className="select" value={fromNodeId} onChange={(e) => setFromNodeId(e.target.value)}>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <span className="collab-arrow">→</span>
          <select className="select" value={toNodeId} onChange={(e) => setToNodeId(e.target.value)}>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </div>
        <input
          className="input"
          placeholder="요청 내용 (ex. 런칭 카피 작성)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <textarea
          className="textarea"
          placeholder="추가 지시 / 프롬프트 (선택)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {fromNodeId === toNodeId && <p className="form-hint">보내는 노드와 받는 노드가 같아요.</p>}
        <button className="btn btn--primary collab-send" onClick={submit} disabled={!valid}>
          요청 보내기
        </button>
      </div>

      <div className="collab-list">
        {pending.length === 0 && resolved.length === 0 && (
          <p className="log-empty">아직 요청이 없어요.</p>
        )}
        {pending.map((r) => (
          <div key={r.id} className="collab-req">
            <div className="collab-req-head">
              <span className="collab-route">
                {nodeName(r.fromNodeId)} <span className="collab-arrow">→</span> {nodeName(r.toNodeId)}
              </span>
              <span className="collab-status collab-status--pending">대기</span>
            </div>
            <div className="collab-req-title">{r.title}</div>
            {r.note && <div className="collab-req-note">{r.note}</div>}
            <div className="collab-req-plan">수락 시 · {planName(r.actionPlanId)}</div>
            <div className="collab-req-actions">
              <button className="btn btn--primary" onClick={() => onResolve(r.id, true)}>
                수락 →
              </button>
              <button className="btn btn--ghost" onClick={() => onResolve(r.id, false)}>
                거절
              </button>
            </div>
          </div>
        ))}
        {resolved.map((r) => (
          <div key={r.id} className="collab-req collab-req--resolved">
            <div className="collab-req-head">
              <span className="collab-route">
                {nodeName(r.fromNodeId)} <span className="collab-arrow">→</span> {nodeName(r.toNodeId)}
              </span>
              <span
                className={`collab-status ${
                  r.status === "accepted" ? "collab-status--ok" : "collab-status--no"
                }`}
              >
                {r.status === "accepted" ? "수락됨" : "거절됨"}
              </span>
            </div>
            <div className="collab-req-title">{r.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
