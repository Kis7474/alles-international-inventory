#!/usr/bin/env bash
set -euo pipefail

# Resolve known PR conflicts for this repository.
# Usage:
#   1) Start from conflict state after `git merge <target-branch>` or `git rebase <target-branch>`
#   2) Run: ./scripts/git/resolve-pr-conflicts.sh
#   3) Review diff, then commit.

FILES=(
  ".env.example"
  "app/api/upload/route.ts"
  "prisma/schema.prisma"
)

for file in "${FILES[@]}"; do
  if git ls-files -u -- "$file" | grep -q .; then
    echo "[resolve] choosing current branch version (ours): $file"
    git checkout --ours -- "$file"
    git add "$file"
  else
    echo "[skip] no conflict marker for: $file"
  fi
done

if git diff --check | grep -q .; then
  echo "[warn] whitespace/conflict issues still present; please review manually"
else
  echo "[ok] targeted conflicts resolved (if present)."
fi
