#!/usr/bin/env bash
set -euo pipefail

# 즉시 충돌 해결 + 커밋 스크립트
# 사용: 충돌 상태에서 실행
#   ./scripts/git/fix-pr-conflict-now.sh

TARGET_FILES=(
  ".env.example"
  "app/api/upload/route.ts"
  "prisma/schema.prisma"
)

resolved_any=false

for file in "${TARGET_FILES[@]}"; do
  if git ls-files -u -- "$file" | grep -q .; then
    echo "[resolve] $file -> ours 선택"
    git checkout --ours -- "$file"
    git add "$file"
    resolved_any=true
  fi
done

if [[ "$resolved_any" == "false" ]]; then
  echo "[info] index 기준 충돌 파일이 없습니다."
  echo "[info] 충돌이 GitHub UI에만 보이면 로컬에서 target 브랜치 merge/rebase 후 다시 실행하세요."
  exit 0
fi

if git diff --name-only --diff-filter=U | grep -q .; then
  echo "[error] 아직 해결되지 않은 충돌이 남아 있습니다. 수동 확인 필요"
  git diff --name-only --diff-filter=U
  exit 1
fi

git commit -m "chore: resolve merge conflicts (.env, upload route, prisma schema)" || true

echo "[ok] 충돌 정리 및 커밋 완료"
