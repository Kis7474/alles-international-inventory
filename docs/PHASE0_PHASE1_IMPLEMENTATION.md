# Phase 0 + Phase 1 구현/실행 가이드 (업로드 중심 MVP)

## Phase 0 - 서버 이식 뼈대

### 변경 파일
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `worker/main.ts`
- `app/api/health/route.ts`
- `app/api/ready/route.ts`
- `docs/security/TAILSCALE_UFW_GUIDE.md`

### 실행 방법
```bash
cp .env.example .env
docker compose up -d --build
npm run migrate:deploy
```

### 테스트 방법 (샘플 파일 없이)
```bash
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:3000/api/ready
ss -lntp | rg '3000|5432'
```

---

## Phase 1 - 사용자 업로드 -> Draft 생성 -> Approve

### 변경 파일
- `prisma/schema.prisma`
- `prisma/migrations/20260305090000_phase0_phase1_automation/migration.sql`
- `app/api/automation/documents/upload/route.ts`
- `app/api/automation/documents/sales/upload/route.ts` (호환 유지)
- `app/api/automation/documents/[id]/route.ts`
- `app/api/automation/drafts/[id]/route.ts`
- `app/api/automation/drafts/[id]/approve/route.ts`
- `app/automation/page.tsx`
- `app/automation/drafts/[id]/page.tsx`
- `lib/document-parsers/sales-statement-fixed.ts`
- `lib/automation/text-normalize.ts`
- `lib/sidebar-menu.ts`

### 실행 방법
1. 로그인 후 `/automation` 접속
2. 문서 유형 선택 후 파일 업로드 (`SALES_STATEMENT`, `PURCHASE_STATEMENT`, `IMPORT_INVOICE`, `IMPORT_DECLARATION`)
3. worker가 업로드된 문서를 파싱해 Draft 생성 (MVP 파서는 매출 거래명세서 우선 지원)
4. Draft 상세에서 매칭 결과 확인 후 `Approve & Post` 실행(ADMIN만 가능)

### 테스트 방법 (샘플 파일 없이)
```bash
# 1) 테스트용 텍스트 파일 생성
cat > /tmp/sales-sample.txt <<'TXT'
받는분: 테스트거래처
2026-03-01
1. 잉크A 10 1,000 10,000
2. 잉크B 5 2,000 10,000
총금액 20,000
TXT

# 2) 로그인 쿠키를 준비한 상태에서 업로드
curl -b cookie.txt -c cookie.txt -F "documentType=SALES_STATEMENT" -F "file=@/tmp/sales-sample.txt;type=text/plain" http://127.0.0.1:3000/api/automation/documents/upload

# 3) worker 처리 후 문서 조회
curl -b cookie.txt http://127.0.0.1:3000/api/automation/documents/<documentId>

# 4) draft 조회/승인
curl -b cookie.txt http://127.0.0.1:3000/api/automation/drafts/<draftId>
curl -X POST -b cookie.txt http://127.0.0.1:3000/api/automation/drafts/<draftId>/approve
```

> worker는 업로드된 문서 파싱/재처리 전용이며, 확정 반영은 `approve` API에서만 수행됨.
