# ERP 자동화(전표 인입/추출/매칭/Draft 승인) 갭 분석 + MVP 구현 계획

작성 목적: 현재 코드베이스를 기준으로, 아래 5가지 자동화를 **서버 이식 가능한 구조(배포/도커/`/data`/백그라운드 워커)** 로 우선 정비한 뒤 단계적으로 구현하기 위한 실행 계획을 제시한다.

---

## 0) 요구사항 재정의(핵심 원칙)

1. **모든 재고/전표 반영은 Draft → Approve 후 확정**
   - 자동화는 “초안 생성”까지만 수행.
   - 승인 이벤트에서만 `SalesRecord`, `ImportExport`, `InventoryLot`, `InventoryMovement` 등 확정 테이블 반영.

2. **로컬 개발 → 회사 서버 이식 우선**
   - 현재 Next.js 단일 프로세스 중심 구조를, 웹/API와 워커를 분리 가능한 구조로 개선.
   - 파일 저장 루트를 `/data` 하위로 통일하고 환경변수로 제어.

3. **문서 자동화는 신뢰도 점수 + 사람 승인 기반**
   - 매칭 확신이 높은 경우만 자동 채택, 그 외는 추천/검수 UI를 통해 승인.

4. **결제 여부는 ERP 수기 체크(payment_status)**
   - 은행 API 연동 없이 내부 상태 플래그로 관리.

---

## 1) 현재 코드 구조 요약 (As-Is)

### 1-1. 아키텍처
- 단일 Next.js(App Router) 프로젝트에서 UI + API Route Handler를 함께 운영.
- DB는 Prisma + PostgreSQL.
- 문서 파일 업로드는 API에서 파일을 직접 저장(`lib/file-storage.ts`).
- 외부 연동은 UNI-PASS 중심이며, 장기 작업용 전용 워커/큐는 부재.

### 1-2. 도메인/데이터 흐름
- 핵심 엔터티: `Product`, `Vendor`, `ImportExport`, `InventoryLot`, `InventoryMovement`, `SalesRecord`.
- 현재 등록 API는 대부분 **즉시 확정(write-through)** 방식으로 동작.
  - 예: `app/api/import-export/route.ts`에서 수입 등록 직후 lot 자동 생성.
  - 예: `app/api/sales/route.ts`에서 매출 생성 즉시 `SalesRecord` 생성.
- 즉, “Draft 상태에서 대기 후 승인 시 반영”이라는 트랜잭션 게이트가 현재 구조에 없다.

### 1-3. 문서 업로드/추출 관련 현황
- 업로드 API:
  - PDF 업로드: `app/api/upload/route.ts`
  - Excel 업로드: `app/api/upload/excel/route.ts`
- 현재 Excel 업로드는 주로 마스터/거래 생성용 파서이며, “다양한 양식의 문서 인식 + 후보 추천 + alias 학습” 체계는 없다.
- 거래명세서 출력/양식 관련 기능은 존재하나, “역방향(업로드→자동전표 Draft)” 파이프라인은 부분적/부재.

### 1-4. 배포/운영/이식 관점
- `package.json` 기준 Docker/worker 실행 스크립트 부재.
- repo 내 Dockerfile/docker-compose 미존재.
- 파일 저장은 기본적으로 `process.cwd()/public/uploads` (환경변수로 변경 가능)이며 `/data` 표준화는 미완료.
- 백그라운드 잡(POP3 메일 수집/비동기 OCR/재처리 큐) 인프라 부재.

---

## 2) 요구 자동화별 갭 분석

## 2-1) 매출 거래명세서(고정 PDF/Excel) → 필드 추출 → 품목 매칭(<=100) → 출고+매출 Draft → 승인 확정

### 현재 대비 갭
- 고정 템플릿 파서(문서 타입별 parser registry) 부재.
- `Product` 매칭은 단순 이름 검색 수준이며, 문서 기반 표준화/정규화 매칭 로직 부재.
- 출고/매출을 Draft로 만드는 공통 Draft 엔진 부재.

### 설계 포인트
- 고정 포맷 문서는 규칙기반 extractor로 MVP 구현(모델 기반 OCR 이전).
- 품목 수 100개 이하라는 조건을 활용해, 정규화 문자열 + 별칭(alias) + vendor context 매칭 정확도 향상.

---

## 2-2) 매입 명세서(양식 다양) → 라인 추출 → Top3 후보 + alias 누적 → 미매칭 TMP 품목 → 입고+매입 Draft → 승인 확정

### 현재 대비 갭
- 다형식 문서 인식 계층(문서 분류/파서 fallback) 부재.
- 후보 추천 엔진(유사도 점수 + 상위 N개) 부재.
- `ItemAlias`, `TempItem` 데이터 모델 부재.
- 승인 전 임시 품목을 통해 입고/매입 Draft를 연결하는 워크플로우 부재.

### 설계 포인트
- MVP: 규칙 기반 후보추천(문자열 유사도 + 거래처 prior + 최근 사용 빈도).
- 승인 시 alias를 학습 저장하여 재사용.

---

## 2-3) 수입신고서류 업로드 → ImportCase 생성/연결 → 라인 추출 → 품목/규격 사람 확인 → 입고 Draft 생성

### 현재 대비 갭
- `ImportExport`/`CustomsTracking`은 있으나 “문서 케이스 단위(`ImportCase`)” 엔터티 부재.
- 수입신고서류 원본/추출결과를 버전 관리하는 문서 엔터티 부재.
- 수입신고서류 기반 라인 추출 후 “사람 확인 default” UX/API 부재.

### 설계 포인트
- `ImportCase` 중심으로 신고서류/인보이스/부속문서를 묶고, 케이스 단위 승인 단계 도입.
- 사무실/창고/바로납품(storage choice)은 승인 UI에서 사람 선택을 강제.

---

## 2-4) 수입 인보이스 + 수입신고서류 동시 입력 교차검증

### 현재 대비 갭
- 문서 간 field-level reconcile 모델 부재.
- 불일치 표시/일치 자동 채택 규칙 엔진 부재.

### 설계 포인트
- 라인 키(품명 정규화 + 수량 + 금액 ±허용오차) 기준 매칭.
- 일치율이 임계치 이상이면 자동 채택, 불일치는 검수 큐로 보냄.

---

## 2-5) payment_status 수기 체크

### 현재 대비 갭
- `SalesRecord`/`ImportExport`에 표준 결제 상태 필드(예: UNPAID/PARTIAL/PAID/WAIVED) 부재 또는 일관성 부재.
- 승인 후 결제 상태 변경 이력(감사로그 보강) 필요.

---

## 3) 서버 이식 우선 계획 (최우선)

## 3-1. 런타임 분리(웹/API vs 워커)

### 목표
- 웹 요청과 비동기 처리(문서 파싱/OCR/메일수집/재시도)를 분리해 안정성 확보.

### 제안
- 프로세스 2종:
  - `web`: Next.js UI/API
  - `worker`: 큐 소비자(문서 처리, POP3 수집, 재처리)
- 큐 백엔드 MVP:
  - 1안: PostgreSQL 기반 job table(추가 인프라 최소)
  - 2안: Redis+BullMQ(처리량 증가 대비)

## 3-2. 파일 경로 `/data` 표준화
- 환경변수 표준:
  - `FILE_STORAGE_ROOT=/data/uploads`
  - `DOCUMENT_ARCHIVE_ROOT=/data/documents`
  - `JOB_ARTIFACT_ROOT=/data/jobs`
- 로컬은 bind mount, 서버는 NAS/로컬디스크 마운트.
- 파일 메타는 DB에 저장하고, 실제 바이너리는 `/data`에 저장.

## 3-3. Docker/배포 기준선 수립
- `Dockerfile`(multi-stage) + `docker-compose.yml`(web, worker, db) 추가.
- 헬스체크/로그 로테이션/타임존/KST 명시.
- 마이그레이션 정책: 배포 파이프라인에서 `prisma migrate deploy`.

## 3-4. 운영 안정화 체크리스트
- 재시도 정책(지수백오프) + DLQ(실패 job 분리).
- idempotency key(문서 중복 업로드 방지).
- 감사로그(AuditLog)에 승인자/승인시각/변경필드 기록.

---

## 4) DB 스키마 제안 (신규/확장)

> 기존 확정 테이블(`SalesRecord`, `ImportExport`, `InventoryLot`, `InventoryMovement`)은 유지하고, 자동화 파이프라인은 별도 Draft 계층으로 추가.

### 4-1. 핵심 신규 테이블

1. **ImportCase**
- 목적: 수입 건 단위 컨테이너(인보이스/신고서류/통관/입고 Draft 묶음)
- 주요 필드:
  - `id`, `caseNo`, `vendorId?`, `status`(`COLLECTING`,`REVIEW`,`APPROVED`,`POSTED`)
  - `customsTrackingId?`, `importExportId?`(확정 후 연결)
  - `createdBy`, `approvedBy?`, `approvedAt?`

2. **Document**
- 목적: 업로드 원본과 파싱 결과 저장
- 주요 필드:
  - `id`, `documentType`(`SALES_STATEMENT`,`PURCHASE_STATEMENT`,`IMPORT_DECLARATION`,`IMPORT_INVOICE`)
  - `source`(`UPLOAD`,`POP3`), `storagePath`, `mimeType`, `checksum`
  - `parseStatus`, `parsedAt`, `extractedJson`, `confidence`
  - `importCaseId?`, `vendorId?`, `issueDate?`

3. **DraftHeader / DraftLine**
- 목적: 확정 전 업무 데이터 staging
- `DraftHeader` 예시 필드:
  - `draftType`(`SALES_OUTBOUND`,`PURCHASE_INBOUND`,`IMPORT_INBOUND`)
  - `status`(`DRAFT`,`REVIEW_REQUESTED`,`APPROVED`,`REJECTED`,`POSTED`)
  - `sourceDocumentId`, `vendorId`, `memo`, `approvalRequired=true`
- `DraftLine` 예시 필드:
  - `lineNo`, `rawItemName`, `matchedProductId?`, `tempItemId?`
  - `quantity`, `unitPrice`, `amount`, `matchScore`, `matchMethod`

4. **ItemAlias**
- 목적: 거래처별/전역 별칭 학습
- 주요 필드:
  - `aliasText`, `normalizedAlias`, `productId`, `vendorId?`, `usageCount`, `lastUsedAt`, `approvedBy`

5. **TempItem**
- 목적: 미매칭 품목 임시 관리
- 주요 필드:
  - `tempCode`(TMP-YYYYMM-####), `rawName`, `normalizedName`, `vendorId?`, `status`(`ACTIVE`,`MERGED`,`DEPRECATED`)
  - `mergedToProductId?`

6. **DocumentReconcile**
- 목적: 인보이스 vs 신고서류 교차검증 결과 저장
- 주요 필드:
  - `leftDocumentId`, `rightDocumentId`, `fieldPath`, `leftValue`, `rightValue`, `isMatch`, `delta`, `decision`

7. **PaymentStatusHistory** (또는 기존 AuditLog 확장)
- 목적: 수기 결제상태 변경 이력
- 주요 필드:
  - `targetType`, `targetId`, `fromStatus`, `toStatus`, `changedBy`, `changedAt`, `memo`

### 4-2. 기존 테이블 확장 제안
- `SalesRecord`: `paymentStatus`, `paymentCheckedBy`, `paymentCheckedAt`
- `ImportExport`: 동일 결제 상태 필드 추가
- `InventoryMovement`/`SalesRecord`에 `postedFromDraftId` 연결(추적성 강화)

---

## 5) API / UI / 워커 단계별(MVP) 구현 계획

## Phase 0 (선행, 1~2주): 이식/운영 기반

### API/서버
- `/api/health`, `/api/ready` 추가.
- 파일 저장 설정 `/data` 강제 검증(부팅 시).
- Job enqueue/dequeue용 내부 모듈 추가.

### 워커
- `worker/main.ts` 생성: job poller + processor registry.
- 실패 재시도/DLQ/모니터링 로그 구조화.

### 배포
- Dockerfile + compose + `.env.example` 서버용 변수 확정.

---

## Phase 1 (2~3주): 공통 문서 파이프라인 + Draft 엔진

### API
- `POST /api/documents` 업로드(파일 저장 + Document 레코드 생성 + parse job enqueue)
- `GET /api/documents/:id` 파싱/매칭 상태 조회
- `POST /api/drafts` / `GET /api/drafts/:id` / `POST /api/drafts/:id/approve`

### 워커
- 문서 타입별 extractor(고정 거래명세서 PDF/Excel 우선)
- 정규화/라인 추출/기본 매칭 엔진

### UI
- “자동화 수신함” 화면(문서 상태, 파싱 성공/실패)
- Draft 검수/승인 화면(라인별 매칭 확인/수정)

---

## Phase 2 (2~4주): 매출 자동화 + 매입 Top3 추천/alias/TMP

### 매출 자동화
- 고정 양식 거래명세서 parser 확장.
- 출고+매출 Draft 동시 생성.
- 승인 시만 `InventoryMovement(OUT)` + `SalesRecord(SALES)` 반영.

### 매입 자동화
- 다양한 양식 fallback parser(템플릿 사전 + 휴리스틱).
- 후보 Top3 API 제공.
- 승인 시 alias 누적 저장.
- 미매칭 라인은 TempItem 자동 생성 후 입고+매입 Draft 유지.

---

## Phase 3 (2~3주): ImportCase + 교차검증

### API
- `POST /api/import-cases` (신규/자동생성)
- `POST /api/import-cases/:id/documents` (신고서/인보이스 연결)
- `POST /api/import-cases/:id/reconcile` (교차검증 실행)

### 워커
- 수입신고서 parser + invoice parser.
- 라인 reconcile 및 불일치 플래그 생성.

### UI
- ImportCase 상세 화면: 문서 2종 비교 테이블(일치/불일치/자동채택 표시).
- storage type(사무실/창고/바로납품) 사람 선택 후 Draft 승인.

---

## Phase 4 (1~2주): POP3 메일 수집 + 운영 고도화

### 워커(POP3 Collector)
- 주기적으로 메일함 조회, 첨부파일 추출, 중복 체크(checksum/message-id).
- 첨부를 `Document`로 적재 후 parse job enqueue.

### 운영
- 실패 원인 코드화(암호오류, 포맷미지원, OCR실패).
- 관리자 재처리 버튼 및 알림.

---

## 6) 승인(Approve) 시 확정 반영 트랜잭션 설계

1. Draft 상태 검증(`DRAFT`/`REVIEW_REQUESTED`만 승인 가능).
2. 라인별 매칭 검증(미매칭 허용정책 확인: TMP로 대체되었는지).
3. 단일 DB 트랜잭션으로 확정 반영:
   - 매출 Draft: `SalesRecord(SALES)` + `InventoryMovement(OUT)`
   - 매입 Draft: `SalesRecord(PURCHASE)` + `InventoryMovement(IN)` 또는 `InventoryLot`
   - 수입 Draft: `ImportExport` + 필요시 `ImportExportItem` + `InventoryLot`
4. `postedFromDraftId`, `approvedBy`, `approvedAt` 기록.
5. 실패 시 전량 롤백 + Draft 상태 유지.

---

## 7) 실제 파일 단위 수정/추가 제안

## 7-1. 배포/운영 기반
- `Dockerfile` (신규)
- `docker-compose.yml` (신규)
- `.env.example` (확장: `/data`, worker, POP3 변수)
- `scripts/deploy/run-migrate.sh` (신규)
- `scripts/worker/start-worker.ts` 또는 `worker/main.ts` (신규)

## 7-2. DB/Prisma
- `prisma/schema.prisma` (신규 모델/필드 추가)
- `prisma/migrations/<timestamp>_add_document_draft_importcase_alias_tempitem/` (신규)

## 7-3. 서버 API
- `app/api/documents/route.ts` (신규 또는 확장)
- `app/api/documents/[id]/route.ts` (신규)
- `app/api/drafts/route.ts` (신규)
- `app/api/drafts/[id]/approve/route.ts` (신규)
- `app/api/import-cases/route.ts` (신규)
- `app/api/import-cases/[id]/reconcile/route.ts` (신규)
- 기존 `app/api/import-export/route.ts`, `app/api/sales/route.ts` (승인 기반 흐름으로 리팩터)

## 7-4. 도메인 로직(lib)
- `lib/document-ingest.ts` (신규)
- `lib/document-parsers/sales-statement-fixed.ts` (신규)
- `lib/document-parsers/purchase-statement-heuristic.ts` (신규)
- `lib/document-parsers/import-declaration.ts` (신규)
- `lib/matching/item-matcher.ts` (신규: Top3 후보)
- `lib/draft-posting.ts` (신규: approve 트랜잭션)
- `lib/file-storage.ts` (수정: `/data` 기본값/경로 정책 강화)

## 7-5. UI
- `app/automation/inbox/page.tsx` (신규)
- `app/automation/drafts/page.tsx` (신규)
- `app/automation/drafts/[id]/page.tsx` (신규)
- `app/import-export/cases/[id]/page.tsx` (신규)
- 사이드바 메뉴(`lib/sidebar-menu.ts`) 및 권한 가드 업데이트

## 7-6. 워커/메일 수집
- `worker/processors/parse-document.ts` (신규)
- `worker/processors/reconcile-import-docs.ts` (신규)
- `worker/processors/pop3-collector.ts` (신규)
- `lib/mail/pop3-client.ts` (신규)

---

## 8) 리스크 및 완화

- **리스크: 문서 양식 다양성으로 추출 실패율 증가**
  - 완화: 문서 타입별 parser versioning + 수동 보정 UI + 재학습(alias)
- **리스크: 승인 이전/이후 데이터 중복 반영**
  - 완화: Draft 승인 idempotency key + posted flag unique 제약
- **리스크: 서버 이식 후 파일 권한/경로 이슈**
  - 완화: `/data` health check + 시작 시 writable 검증 + 운영 runbook
- **리스크: 워커 장애 시 처리 지연**
  - 완화: 큐 backlog 모니터링 + 재시작 정책 + DLQ 운영

---

## 9) 최종 권고 (우선순위)

1. **Phase 0(배포/도커/`/data`/워커) 먼저 완료**: 서버 이식 안정성 확보.
2. **Draft 엔진 도입 후 자동화 연결**: 즉시확정 구조를 단계적으로 분리.
3. **고정양식(매출) → 다양양식(매입) → 수입 케이스 교차검증 순**으로 확장.
4. **결제상태는 수기 체크 + 이력감사**로 단순/명확하게 운영.

이 순서가 현재 코드베이스 리스크를 최소화하면서, 운영 가능한 자동화로 전환하는 가장 안전한 경로다.
