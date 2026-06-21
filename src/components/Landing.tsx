const GITHUB_URL = "https://github.com/orialthq/relai";

const PREVIEW_PLANS = [
  { name: "완료 → 체크 & 알림", flow: "작업 완료 → 알림", tag: "키 불필요" },
  { name: "협업 요청 라우터", flow: "협업 수락 → 작업 생성", tag: "키 불필요" },
  { name: "노트 → 액션아이템", flow: "회의록 → 작업 추출", tag: "BYOK" },
  { name: "스탠드업 다이제스트", flow: "스케줄 → 요약", tag: "BYOK" },
  { name: "인바운드 → 태스크", flow: "웹훅 → 분류·배정", tag: "BYOK·MCP" },
];

const STEPS = [
  { n: "01", t: "조직을 설계한다", d: "팀·역할을 노드 안의 노드로. 1~5인이면 인원이 아니라 맡은 모자로." },
  { n: "02", t: "액션 플랜을 켠다", d: "트리거 → 스텝. 완료·협업·회의록·인바운드를 자동화 규칙으로." },
  { n: "03", t: "알아서 발화한다", d: "일이 조직을 타고 올바른 팀·사람에게 흘러가고, 회의록·알림이 따라온다." },
];

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <button className="lp-announce" onClick={onEnter}>
        <span className="lp-announce-dot" />
        relai 퍼블릭 프리뷰 — 가입·키 없이 바로 데모
        <span className="lp-announce-arrow">→</span>
      </button>

      <header className="lp-nav">
        <div className="lp-logo">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
            <path
              d="M8 16h7m0 0l-3-3m3 3l-3 3"
              stroke="#6f8dff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="23" cy="16" r="3.2" fill="#6f8dff" />
          </svg>
          <span className="lp-wordmark">
            REL<span className="lp-wordmark-ai">AI</span>
          </span>
        </div>
        <nav className="lp-links">
          <a href="#how">작동 방식</a>
          <a href="#plans">액션 플랜</a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <button className="lp-nav-cta" onClick={onEnter}>
          데모 시작
        </button>
      </header>

      <main className="lp-hero">
        <div className="lp-eyebrow">
          <span className="lp-dot" />
          1~5인 팀을 위한 자동화 OS
        </div>
        <h1 className="lp-title">
          팀을 한 번 설계하면,
          <br />
          <span className="lp-title-accent">일이 알아서 굴러간다.</span>
        </h1>
        <p className="lp-sub">
          회의록·협업·인바운드를 액션 플랜으로 자동화하세요. 평평한 자동화 툴과 달리,
          relai는 <strong>조직 구조 자체가 자동화가 올라타는 기반</strong>이 됩니다.
        </p>
        <div className="lp-ctas">
          <button className="lp-btn lp-btn--primary" onClick={onEnter}>
            데모 시작 →
          </button>
          <a className="lp-btn lp-btn--ghost" href="#how">
            작동 방식 보기
          </a>
        </div>

        <div className="lp-mock">
          <div className="lp-mock-bar">
            <span className="lp-tl" />
            <span className="lp-tl" />
            <span className="lp-tl" />
            <span className="lp-mock-url">relai › demo</span>
          </div>
          <div className="lp-mock-body">
            {PREVIEW_PLANS.map((p) => (
              <div key={p.name} className="lp-mock-row">
                <span className="lp-mock-name">{p.name}</span>
                <span className="lp-mock-flow">{p.flow}</span>
                <span className={`lp-mock-tag ${p.tag === "키 불필요" ? "is-free" : ""}`}>{p.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <section id="how" className="lp-section">
        <h2 className="lp-section-title">작동 방식</h2>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="lp-step">
              <span className="lp-step-n">{s.n}</span>
              <h3 className="lp-step-t">{s.t}</h3>
              <p className="lp-step-d">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plans" className="lp-section">
        <h2 className="lp-section-title">5개 액션 플랜</h2>
        <p className="lp-section-sub">키 없이 도는 것부터 BYOK·MCP까지, 난이도 순으로.</p>
        <div className="lp-plans">
          {PREVIEW_PLANS.map((p, i) => (
            <div key={p.name} className="lp-plan-card">
              <span className="lp-plan-idx">#{i + 1}</span>
              <span className="lp-plan-name">{p.name}</span>
              <span className="lp-plan-flow">{p.flow}</span>
              <span className={`lp-mock-tag ${p.tag === "키 불필요" ? "is-free" : ""}`}>{p.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2 className="lp-final-title">지금 바로 굴려보세요.</h2>
        <button className="lp-btn lp-btn--primary lp-btn--lg" onClick={onEnter}>
          데모 시작 →
        </button>
        <p className="lp-final-note">가입 없음 · 데이터는 브라우저에만 · 오픈소스</p>
      </section>

      <footer className="lp-footer">
        <span>relai · OriAlt</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
