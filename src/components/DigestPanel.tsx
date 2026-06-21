import { useState } from "react";
import type { AppState } from "../types";
import { loadSettings } from "../settings";

function timeStr(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function DigestPanel({
  state,
  busy,
  error,
  onGenerate,
}: {
  state: AppState;
  busy: boolean;
  error: string | null;
  onGenerate: (scopeNodeId: string | null) => void;
}) {
  const nodes = state.org.filter((n) => n.parentId !== null);
  const [scope, setScope] = useState<string>("all");
  const hasKey = !!loadSettings().apiKey;

  return (
    <section className="panel panel--digest">
      <header className="panel-head">
        <h2 className="panel-title">
          스탠드업 다이제스트
          <span className="req req--need">BYOK</span>
        </h2>
        <span className="panel-tag">매일 스케줄 · 지금은 수동</span>
      </header>

      <div className="digest-form">
        <div className="digest-row">
          <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">전체</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn--primary"
            onClick={() => onGenerate(scope === "all" ? null : scope)}
            disabled={busy}
          >
            {busy ? "생성 중…" : "다이제스트 생성"}
          </button>
        </div>
        {!hasKey && <p className="digest-hint">LLM 키가 필요해요 — 노트 패널에서 먼저 저장하세요.</p>}
        {error && <p className="form-hint">{error}</p>}
      </div>

      <div className="digest-list">
        {state.digests.length === 0 && (
          <p className="log-empty">아직 생성된 다이제스트가 없어요.</p>
        )}
        {state.digests.slice(0, 5).map((d) => (
          <div key={d.id} className="digest-card">
            <div className="digest-card-head">
              <span className="digest-scope">{d.scopeLabel}</span>
              <span className="digest-time">{timeStr(d.ts)}</span>
            </div>
            <div className="digest-content">{d.content}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
