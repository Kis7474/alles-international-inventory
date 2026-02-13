# PR 충돌 해결 가이드

GitHub PR에서 아래 파일 충돌이 발생할 때 빠르게 정리하는 절차입니다.

- `.env.example`
- `app/api/upload/route.ts`
- `prisma/schema.prisma`

## 1) 로컬에서 타깃 브랜치 반영

```bash
git fetch origin
git checkout <your-branch>
git merge origin/<target-branch>
# 또는 rebase 사용 시: git rebase origin/<target-branch>
```

## 2) 이 저장소의 기준안으로 충돌 정리

```bash
./scripts/git/resolve-pr-conflicts.sh
```

이 스크립트는 위 3개 파일에 한해 **현재 작업 브랜치(ours)** 버전을 선택합니다.

## 3) 검증

```bash
npm run lint
DATABASE_URL='postgresql://localhost:5432/placeholder' DIRECT_URL='postgresql://localhost:5432/placeholder' npx prisma validate
```

## 4) 완료

```bash
git commit -m "chore: resolve PR merge conflicts"
git push
```

## 수동 해결이 필요한 경우

- 타깃 브랜치에서 해당 파일의 필수 변경이 있을 수 있으므로, 아래를 우선 확인하세요.
  - `.env.example`: 새 환경변수 누락 여부
  - `app/api/upload/route.ts`: 인증 가드/파일 검증 로직 누락 여부
  - `prisma/schema.prisma`: 모델/enum 충돌 여부
