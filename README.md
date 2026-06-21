# relai

**조직을 이해하는 자동화.** 작업이 조직을 타고 스스로 굴러간다.

1~5인 스타트업을 위한 컴포저블 자동화 OS. 조직을 한 번 모델링하면, 반복되는 운영 글루(glue) 작업을 액션 플랜이 알아서 처리한다. 기존 자동화 툴(Zapier·n8n)과 달리 **조직 구조 자체가 자동화가 올라타는 기반**이다.

> rel**AI** — "relay"로 읽히고, 신호가 노드에서 노드로 자동으로 넘어간다는 뜻. 동시에 AI가 박혀 있다.

## 지금 들어있는 것

- **엔진**: Task · ActionPlan · Trigger · 실행기.
- **#1 완료 → 체크 & 알림** (키 불필요): 작업을 `완료`로 옮기면 회의록 항목 자동 체크 + 담당자·노드 알림.
- **#2 협업 요청 라우터** (키 불필요): 노드 A → 노드 B 요청에 액션 플랜 첨부, 수락하면 받는 노드에 작업 생성·배정 + 알림.
- **#3 노트 → 액션아이템** (BYOK LLM): 회의록 텍스트를 붙여넣으면 LLM이 결정사항·액션아이템을 추출 → 노드/담당자로 작업 자동 생성. 자기 Anthropic/OpenAI 키를 브라우저에서 직접 호출(서버리스 불필요). 키는 localStorage에만, export에는 미포함.
- 조직 그래프 · 회의록 · 릴레이 로그 · 알림 인박스 · JSON 내보내기/가져오기

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:5173/relai/
npm run dev:sync   # 위와 동일하되, Ctrl+C로 끌 때 자동 커밋 & 푸시
```

> base 경로가 `/relai/`라서 `localhost:5173/relai/` 로 열린다.

## 빌드 확인

```bash
npm run build
npm run preview
```

## 배포

`main`에 push하면 GitHub Actions가 빌드해서 `https://orialthq.github.io/relai/` 에 배포한다.
최초 1회만 레포 **Settings → Pages → Source = "GitHub Actions"**.

## 다음

- `#4` 스탠드업 다이제스트 (스케줄 + BYOK)
- `#5` 인바운드 → 태스크 (웹훅 + BYOK + MCP)
