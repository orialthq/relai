import { useState } from "react";
import type { AppState } from "../types";
import { loadSettings } from "../settings";

const SOURCES = ["문의", "이메일", "GitHub 이슈", "기타"];

const SAMPLE: Record<string, string> = {
  문의: "안녕하세요, 데모 영상 보고 연락드려요. 50인 규모 팀인데 엔터프라이즈 요금이랑 온프레미스 배포 가능한지 궁금합니다. 가능하면 다음 주에 미팅도 잡고 싶어요.",
  이메일: "결제가 두 번 청구된 것 같아요. 환불 요청합니다. 주문번호 #20413.",
  "GitHub 이슈": "[Bug] 로그인 후 새로고침하면 세션이 풀립니다. Safari 17.4, 재현율 100%.",
  기타: "행사 부스 협찬 제안 드립니다. 다음 달 개발자 컨퍼런스 골드 스폰서 슬롯 남아있어요.",
};

function priorityLabel(p: string) {
  return p === "high" ? "높음" : p === "low" ? "낮음" : "보통";
}

export function InboundPanel({
  state,
  busy,
  error,
  onProcess,
}: {
  state: AppState;
  busy: boolean;
  error: string | null;
  onProcess: (text: string, sourceType: string) => void;
}) {
  const [sourceType, setSourceType] = useState(SOURCES[0]);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const hasKey = !!loadSettings().apiKey;

  const nodeName = (id: string) => state.org.find((n) => n.id === id)?.name ?? "—";

  const copy = (id: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  };

  return (
    <section className="panel panel--inbound">
      <header className="panel-head">
        <h2 className="panel-title">
          인바운드 → 태스크
          <span className="req req--need">BYOK</span>
          <span className="req req--need">MCP</span>
        </h2>
        <span className="panel-tag">웹훅 수신 · 지금은 시뮬레이션</span>
      </header>

      <div className="inbound-form">
        <div className="inbound-row">
          <select className="select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="link-btn" onClick={() => setText(SAMPLE[sourceType] ?? "")}>
            예시 채우기
          </button>
        </div>
        <textarea
          className="textarea"
          rows={3}
          placeholder="들어온 메시지를 붙여넣어요…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn--primary" onClick={() => onProcess(text, sourceType)} disabled={busy || !text.trim()}>
          {busy ? "분류 중…" : "처리"}
        </button>
        {!hasKey && <p className="digest-hint">LLM 키가 필요해요 — 노트 패널에서 먼저 저장하세요.</p>}
        {error && <p className="form-hint">{error}</p>}
      </div>

      <div className="inbound-list">
        {state.inbounds.length === 0 && <p className="log-empty">아직 처리된 인바운드가 없어요.</p>}
        {state.inbounds.slice(0, 5).map((it) => (
          <div key={it.id} className="inbound-card">
            <div className="inbound-card-head">
              <span className={`prio prio--${it.priority}`}>{priorityLabel(it.priority)}</span>
              <span className="inbound-route">
                {it.sourceType} <span className="collab-arrow">→</span> {nodeName(it.nodeId)}
              </span>
            </div>
            <div className="inbound-summary">{it.summary}</div>
            <div className="inbound-channel">
              MCP 전달 예정 · {it.suggestedChannel}
            </div>
            {it.draftReply && (
              <div className="inbound-draft">
                <div className="inbound-draft-label">
                  회신 초안
                  <button className="link-btn" onClick={() => copy(it.id, it.draftReply)}>
                    {copied === it.id ? "복사됨" : "복사"}
                  </button>
                </div>
                <div className="inbound-draft-body">{it.draftReply}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
