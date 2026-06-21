import { useState } from "react";
import type { AppState } from "../types";
import type { ExtractResult } from "../llm";
import { DEFAULT_MODEL, loadSettings, saveSettings, type Provider } from "../settings";

const SAMPLE = `오늘 제품 회의:
- 로그인 API 응답 느린 이슈 확인됨. IQ가 캐싱 적용해서 개선하기로.
- 온보딩 첫 화면 카피가 약하다는 의견. 준학이 초안 다시 쓰기.
- 다음 스프린트부터 주간 데모 도입 결정.`;

export function NotesPanel({
  state,
  busy,
  error,
  result,
  onAnalyze,
}: {
  state: AppState;
  busy: boolean;
  error: string | null;
  result: ExtractResult | null;
  onAnalyze: (nodeId: string, notes: string) => void;
}) {
  const nodes = state.org.filter((n) => n.parentId !== null);
  const [nodeId, setNodeId] = useState(nodes[0]?.id ?? "");
  const [notes, setNotes] = useState("");

  const initial = loadSettings();
  const [editingKey, setEditingKey] = useState(!initial.apiKey);
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [model, setModel] = useState(initial.model);
  const [hasKey, setHasKey] = useState(!!initial.apiKey);

  const saveKey = () => {
    const m = model.trim() || DEFAULT_MODEL[provider];
    saveSettings({ provider, apiKey: apiKey.trim(), model: m });
    setModel(m);
    setHasKey(!!apiKey.trim());
    setEditingKey(!apiKey.trim());
  };

  const onProviderChange = (p: Provider) => {
    setProvider(p);
    if (!model.trim() || model === DEFAULT_MODEL.anthropic || model === DEFAULT_MODEL.openai) {
      setModel(DEFAULT_MODEL[p]);
    }
  };

  return (
    <section className="panel panel--notes">
      <header className="panel-head">
        <h2 className="panel-title">
          노트 → 액션아이템
          <span className="req req--need">BYOK</span>
        </h2>
        {hasKey && !editingKey && (
          <button className="link-btn" onClick={() => setEditingKey(true)}>
            키 편집
          </button>
        )}
      </header>

      {editingKey ? (
        <div className="key-setup">
          <p className="key-note">
            자기 LLM 키를 넣으면 브라우저에서 직접 호출해요. 키는 이 브라우저에만 저장되고 워크스페이스
            내보내기에는 포함되지 않아요.
          </p>
          <div className="key-row">
            <select className="select" value={provider} onChange={(e) => onProviderChange(e.target.value as Provider)}>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
            <input
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="모델"
            />
          </div>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
          />
          <button className="btn btn--primary" onClick={saveKey} disabled={!apiKey.trim()}>
            키 저장
          </button>
        </div>
      ) : (
        <div className="notes-form">
          <div className="notes-row">
            <select className="select" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} 회의록
                </option>
              ))}
            </select>
            <button className="link-btn" onClick={() => setNotes(SAMPLE)}>
              예시 채우기
            </button>
          </div>
          <textarea
            className="textarea"
            rows={5}
            placeholder="회의록 텍스트를 붙여넣어요…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            className="btn btn--primary"
            onClick={() => onAnalyze(nodeId, notes)}
            disabled={busy || !notes.trim()}
          >
            {busy ? "분석 중…" : "액션아이템 추출"}
          </button>

          {error && <p className="form-hint">{error}</p>}

          {result && (
            <div className="extract-result">
              {result.decisions.length > 0 && (
                <div className="extract-block">
                  <div className="extract-label">결정사항</div>
                  <ul className="extract-list">
                    {result.decisions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="extract-block">
                <div className="extract-label">생성된 액션아이템 · {result.actionItems.length}</div>
                <ul className="extract-list">
                  {result.actionItems.map((a, i) => (
                    <li key={i}>
                      {a.title}
                      {a.owner && <span className="extract-owner"> → {a.owner}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
