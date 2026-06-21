import type { ActionPlan, AppState } from "../types";

function triggerLabel(p: ActionPlan): string {
  if (p.trigger.type === "taskStatusChange") return `작업 상태 → ${p.trigger.to}`;
  return `웹훅: ${p.trigger.event}`;
}

function stepLabel(step: ActionPlan["steps"][number]): string {
  if (step.type === "checkoff") return "회의록 항목 체크";
  return `알림 → ${step.to.join(", ")}`;
}

export function PlansPanel({
  state,
  onToggle,
}: {
  state: AppState;
  onToggle: (planId: string) => void;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title">액션 플랜</h2>
        <span className="panel-tag">트리거 → 스텝</span>
      </header>
      <div className="plans">
        {state.plans.map((p) => (
          <div key={p.id} className={`plan ${p.enabled ? "" : "plan--off"}`}>
            <div className="plan-top">
              <span className="plan-name">{p.name}</span>
              <button
                className={`toggle ${p.enabled ? "toggle--on" : ""}`}
                onClick={() => onToggle(p.id)}
                aria-pressed={p.enabled}
                aria-label={`${p.name} ${p.enabled ? "끄기" : "켜기"}`}
              >
                <span className="toggle-knob" />
              </button>
            </div>
            <div className="plan-flow">
              <span className="flow-trigger">{triggerLabel(p)}</span>
              {p.steps.map((s, i) => (
                <span key={i} className="flow-step">
                  <span className="flow-arrow">→</span>
                  {stepLabel(s)}
                </span>
              ))}
            </div>
            <div className="plan-req">
              <span className={`req ${p.requires.llm ? "req--need" : "req--none"}`}>
                {p.requires.llm ? "BYOK 필요" : "키 불필요"}
              </span>
              {p.requires.mcp && <span className="req req--need">MCP 필요</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
