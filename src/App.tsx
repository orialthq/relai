import { useEffect, useRef } from "react";
import { useRelaiStore } from "./store";
import { OrgPanel } from "./components/OrgPanel";
import { PlansPanel } from "./components/PlansPanel";
import { TaskBoard } from "./components/TaskBoard";
import { CollabPanel } from "./components/CollabPanel";
import { NotesPanel } from "./components/NotesPanel";
import { InboundPanel } from "./components/InboundPanel";
import { ChecklistPanel } from "./components/ChecklistPanel";
import { DigestPanel } from "./components/DigestPanel";
import { RelayLog, Notifications } from "./components/RelayLog";

export default function App() {
  const store = useRelaiStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const timed = useRef<Set<string>>(new Set());

  useEffect(() => {
    store.toasts.forEach((t) => {
      if (timed.current.has(t.id)) return;
      timed.current.add(t.id);
      setTimeout(() => store.dismissToast(t.id), 3600);
    });
  }, [store.toasts, store]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            rel<span className="brand-ai">AI</span>
          </span>
          <span className="brand-sub">조직을 이해하는 자동화</span>
        </div>
        <div className="toolbar">
          <button className="btn btn--ghost" onClick={store.exportJson}>
            내보내기
          </button>
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            가져오기
          </button>
          <button className="btn btn--ghost" onClick={store.reset}>
            초기화
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) store.importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <main className="workspace">
        <div className="col col--left">
          <OrgPanel state={store.state} />
          <PlansPanel state={store.state} onToggle={store.togglePlan} />
        </div>
        <div className="col col--center">
          <CollabPanel
            state={store.state}
            onCreate={store.createCollabRequest}
            onResolve={store.resolveCollabRequest}
          />
          <NotesPanel
            state={store.state}
            busy={store.llmBusy}
            error={store.llmError}
            result={store.notesResult}
            onAnalyze={store.analyzeNotes}
          />
          <InboundPanel
            state={store.state}
            busy={store.inboundBusy}
            error={store.inboundError}
            onProcess={store.processInbound}
          />
          <TaskBoard state={store.state} onSetStatus={store.setStatus} />
        </div>
        <div className="col col--right">
          <DigestPanel
            state={store.state}
            busy={store.digestBusy}
            error={store.digestError}
            onGenerate={store.generateStandupDigest}
          />
          <ChecklistPanel state={store.state} />
          <RelayLog state={store.state} />
          <Notifications state={store.state} onMarkAllRead={store.markAllRead} />
        </div>
      </main>

      <div className="toasts">
        {store.toasts.map((t) => (
          <div key={t.id} className="toast" onClick={() => store.dismissToast(t.id)}>
            <div className="toast-fire">⚡ 릴레이 발화</div>
            <div className="toast-plan">{t.planName}</div>
            <div className="toast-detail">
              {t.checkedLabel && <span>회의록 체크 · </span>}
              알림 {t.notifiedCount}명
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
