# relai

**조직을 이해하는 자동화.** 작업이 조직을 타고 스스로 굴러간다.

1~5인 스타트업을 위한 컴포저블 자동화 OS. 조직을 한 번 모델링하면, 반복되는 운영 글루(glue) 작업을 액션 플랜이 알아서 처리한다. 기존 자동화 툴(Zapier·n8n)과 달리 **조직 구조 자체가 자동화가 올라타는 기반**이다.

> rel**AI** — "relay"로 읽히고, 신호가 노드에서 노드로 자동으로 넘어간다는 뜻. 동시에 AI가 박혀 있다.

## 지금 들어있는 것 (MVP)

- **엔진**: Task · ActionPlan · Trigger · 실행기. `#2 협업 요청 라우터`가 그대로 재사용할 데이터 모델.
- **액션 플랜 #1 — 완료 → 체크 & 알림** (키 불필요, 클라이언트 전용):
  작업을 `완료`로 옮기면 → 연결된 회의록 항목이 자동 체크되고 → 담당자와 소속 노드에 알림이 발화된다.
- 조직 그래프(노드 안의 노드) · 회의록 · 릴레이 로그 · 알림 인박스
- JSON 내보내기/가져오기 · 초기화 (백엔드 없음, 데이터는 브라우저 localStorage)

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5173/relai/
```

> base 경로가 `/relai/`라서 `localhost:5173/` 가 아니라 `localhost:5173/relai/` 로 열린다.

## 빌드 확인

```bash
npm run build
npm run preview
```

## 배포

`main`에 push하면 GitHub Actions가 자동으로 빌드해서 `https://orialthq.github.io/relai/` 에 배포한다.
최초 1회만 레포 **Settings → Pages → Source = "GitHub Actions"** 로 설정하면 된다.

## 다음

- `#2` 협업 요청 라우터 (노드 A → 노드 B, 액션 플랜 + 프롬프트 첨부)
- `#3` 노트 → 액션아이템 (BYOK LLM)
- `#4` 스탠드업 다이제스트 · `#5` 인바운드 → 태스크 (BYOK + MCP)
