#!/usr/bin/env bash
# `npm run dev:sync` 로 실행하면, Ctrl+C로 끌 때 자동으로 커밋 & 푸시한다.

sync_repo() {
  git add -A
  if git diff --cached --quiet; then
    echo "📭 변경 없음 — 커밋 스킵"
  else
    git commit -m "chore: dev session $(date '+%Y-%m-%d %H:%M')"
    branch="$(git rev-parse --abbrev-ref HEAD)"
    if git push origin "$branch"; then
      echo "✅ $branch 푸시 완료"
    else
      echo "⚠️  푸시 실패 — 수동으로 확인하세요"
    fi
  fi
}

trap 'echo; echo "⏹  dev 종료 감지 → 동기화"; sync_repo; exit 0' INT TERM

npm run dev

# vite가 스스로 종료된 경우(시그널 아님)에도 동기화
sync_repo
