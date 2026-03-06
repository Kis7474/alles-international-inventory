# 무역 재고관리 시스템 (알레스인터네셔날)

해외에서 물건을 수입해서 국내에 판매하는 무역업체를 위한 통합 ERP 시스템입니다.
매입/매출, 수입/수출, 재고, 프로젝트, 문서 관리 등 무역업 전반의 업무를 지원합니다.

## 주요 기능

### 1. 매입/매출 관리
- 거래 내역 등록, 수정, 삭제
- 다중 필터링 (거래유형, 담당자, 카테고리, 거래처, 품목, 날짜)
- 페이지네이션 (50건 단위)
- 마진 및 마진율 자동 계산
- **스마트 단가 적용**: 최근 거래가 → 거래처별 특별가 → 기본가 우선순위 자동 적용
- 월별/연도별 리포트
- 엑셀 업로드/다운로드 (통합 양식 지원)
- 거래명세서 자동 생성 (거래처 정보 자동 채움)

### 2. 수입/수출 관리
- 수입/수출 건별 관리
- 품목별 수량, 단가, 금액 관리
- 환율 자동 적용 및 수동 입력
- 통관 추적 (UNI-PASS API 연동)
- B/L 번호 기반 화물 진행 상황 조회
- 수입신고 정보 자동 조회

### 3. 재고 관리
- LOT 단위 입고 관리
- FIFO(선입선출) 자동 출고 처리
- 품목별 재고 현황 조회
- 창고료 관리 및 배분
- 원가 자동 계산
- 월별 원가 이력 추적

### 4. 프로젝트 관리
- 프로젝트별 품목 관리
- 프로젝트 진행 상황 추적
- 프로젝트 리포트

### 5. 문서 관리
- 견적서 생성 및 관리
- 거래명세서 생성 및 관리
- PDF/엑셀 다운로드
- 매출 내역 연동

### 6. 마스터 데이터 관리
- 거래처 관리 (국내/해외, 매입/매출)
- 품목 관리 (제품/자재/부품)
- 서비스 관리
- 카테고리 관리
- 담당자 관리
- 거래처별 특별가 관리
- **엑셀 통합 업로드**: 품목/거래처/가격 일괄 등록 및 매입매출 데이터 업로드

## 기술 스택

### 프론트엔드 & 백엔드
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**

### 데이터베이스
- **Prisma ORM**
- **PostgreSQL** (Self-hosted Docker)

### 라이브러리
- **ExcelJS** - 엑셀 파일 파싱 및 생성
- **date-fns** - 날짜 처리
- **jsPDF** - PDF 생성
- **UNI-PASS API** - 관세청 통관 정보 조회

## 설치 및 실행 방법

### 1. 저장소 클론
```bash
git clone https://github.com/Kis7474/alles-international-inventory.git
cd alles-international-inventory
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 생성하세요.

**로컬/서버 공통 (PostgreSQL 사용)**
```bash
# .env 파일 내용
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/alles_inventory"
```

**또는 PostgreSQL 사용 (로컬 또는 클라우드)**
```bash
# .env 파일 내용
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
```

### 오프라인/NAS 파일 저장소 설정 (선택)
PDF 첨부파일은 기본적으로 `public/uploads`에 저장되며, 아래 환경 변수를 사용하면 NAS 마운트 경로로 바로 저장할 수 있습니다.

```bash
FILE_STORAGE_ROOT="/mnt/nas/alles-inventory/uploads"
FILE_PUBLIC_BASE_URL="/uploads"
```

- `FILE_STORAGE_ROOT`: 실제 파일이 저장되는 경로
- `FILE_PUBLIC_BASE_URL`: DB에 저장될 공개 URL prefix

> NAS 전환 시에는 서버에서 NAS를 마운트한 뒤 `FILE_STORAGE_ROOT`만 교체하면 동일 코드로 운영할 수 있습니다.

### 4. 데이터베이스 초기화
```bash
npx prisma generate
npx prisma db push
```

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 브라우저에서 접속
```
http://localhost:3000
```

## Windows에서 실행하는 방법 (상세 가이드)

아래는 **Windows 10/11 + PowerShell** 기준입니다. 처음 세팅하는 경우를 가정해, 설치부터 실행/DB/Seed 여부까지 순서대로 정리했습니다.

### 0) 사전 준비

1. **Node.js LTS 설치**
   - 권장: Node.js 20 LTS
   - 설치 후 PowerShell에서 확인:
   ```powershell
   node -v
   npm -v
   ```

2. **Git 설치**
   - 설치 후 확인:
   ```powershell
   git --version
   ```

3. **PostgreSQL 준비** (로컬 설치 또는 클라우드 DB)
   - 이 프로젝트의 Prisma datasource는 PostgreSQL 기준입니다.
   - 로컬 DB를 쓸 경우 DB/계정 생성 후 연결 문자열을 준비합니다.

4. (선택) **Visual Studio Code** 설치
   - TypeScript/ESLint 확인이 편해집니다.

---

### 1) 저장소 클론

```powershell
git clone https://github.com/Kis7474/alles-international-inventory.git
cd alles-international-inventory
```

---

### 2) 의존성 설치

```powershell
npm install
```

> `postinstall`에서 Prisma Client가 자동 생성됩니다.

---

### 3) 환경 변수(.env) 설정

1. `.env.example`을 복사해 `.env` 파일 생성
2. 최소한 아래 값을 설정

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
```

#### 인증 Seed를 쓸 경우(권장) 추가 변수

```env
SEED_ADMIN_PASSWORD="원하는관리자비밀번호"
SEED_STAFF_PASSWORD="원하는일반사용자비밀번호"
```

#### (선택) 파일 저장 경로 설정

```env
FILE_STORAGE_ROOT="C:/alles/uploads"
FILE_PUBLIC_BASE_URL="/uploads"
```

> Windows 경로는 `/` 또는 `\\` 형태를 일관되게 사용하세요.

---

### 4) DB 스키마 반영

```powershell
npx prisma generate
npx prisma db push
```

스키마가 정상인지 빠르게 확인하려면:

```powershell
npx prisma studio
```

---

### 5) Seed 필요 여부 (중요)

- **필수는 아님**: 빈 DB로도 앱 자체는 실행됩니다.
- **권장**: 로그인/기초 마스터 데이터(담당자, 계정 등)를 바로 확인하려면 seed 실행을 권장합니다.

```powershell
npx prisma db seed
```

---

### 6) 개발 서버 실행

```powershell
npm run dev
```

브라우저 접속:

```text
http://localhost:3000
```

---

### 7) 최초 구동 체크리스트 (Smoke Check)

1. 로그인 페이지 접근 가능 여부 확인
2. 기본 목록 페이지(예: 매입매출/품목) 진입 가능 여부 확인
3. API 에러 없이 초기 데이터 로딩되는지 확인

---

### 8) Windows에서 자주 겪는 이슈

1. **`DATABASE_URL` 오류**
   - 공백/따옴표 누락, 비밀번호 특수문자 인코딩을 확인하세요.

2. **포트 충돌(3000 사용 중)**
   ```powershell
   $env:PORT=3001
   npm run dev
   ```

3. **Prisma 연결 실패**
   - 방화벽, DB host 접근 허용, `DIRECT_URL` 오타를 점검하세요.

4. **권한 문제(파일 저장 경로)**
   - `FILE_STORAGE_ROOT`를 사용자 쓰기 가능한 경로로 지정하세요.

5. **줄바꿈/인코딩 문제**
   - `.env`는 UTF-8로 저장하고, 숨김 확장자(`.env.txt`)가 아닌지 확인하세요.

## 배포 가이드 (Ubuntu + Docker Compose + Local PostgreSQL)

이 프로젝트의 운영 기준은 **자체 호스팅 Ubuntu 서버 + Docker Compose + 로컬 PostgreSQL** 입니다.

### 1) 빠른 시작

```bash
cp .env.example .env
mkdir -p ./data/documents ./data/uploads ./data/backups
chmod -R 775 ./data
docker compose up -d --build postgres
docker compose run --rm web npm run migrate:deploy
docker compose up -d web worker
```

### 2) 접속/보안
- `web`: `127.0.0.1:${WEB_PORT}` 바인딩
- `postgres`: `127.0.0.1:${POSTGRES_PORT}` 바인딩
- 외부 접근은 Tailscale + UFW 정책으로 제한

참고: `docs/security/TAILSCALE_UFW_GUIDE.md`

### 3) 데이터베이스 운영 원칙
- 단일 소스 오브 트루스: compose의 `postgres` 컨테이너
- Supabase/SQLite 기준 운영은 사용하지 않음
- 마이그레이션은 `npm run migrate:deploy` 기준

### 4) 완전 초기화(데이터 파기)

```bash
./scripts/selfhost/reset-db.sh
```

### 5) 주요 환경 변수

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/alles_inventory
DIRECT_URL=postgresql://postgres:postgres@postgres:5432/alles_inventory
FILE_STORAGE_ROOT=/data/uploads
DOCUMENTS_STORAGE_ROOT=/data/documents
BACKUP_ROOT=/data/backups
```

## 인증/권한 및 온프레/NAS 실행 문서

최신 확정안(역할 2개, 4계정, 온프레 DB, NAS 후보)은 아래 문서를 참고하세요.

- `docs/ONPREM_NAS_AUTH_PLAN.md`
- `docs/ROLE_PERMISSION_MATRIX.md`

온프레/NAS 실행 스크립트:
- `scripts/onprem/setup-postgres.sh`
- `scripts/onprem/nas-precheck.sh`

기본 인증 API:
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`


## 라이선스

MIT

## 문의

이슈가 있거나 문의사항이 있으시면 GitHub Issues를 이용해주세요.


## 보안/권한 고도화 진행 상태

다음 항목을 단계적으로 확장할 수 있도록 기반을 추가했습니다.

- 파일 업로드 보안 강화
  - MIME 타입 + PDF 시그니처(`%PDF-`) 이중 검증
  - UUID 기반 파일명 사용
  - 업로드 디렉토리 자동 생성
- 웹 보안 헤더 기본 적용
  - `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` 등
- 사용자/권한 모델(Prisma) 추가
  - `User`, `UserSession`, `AuditLog`, `UserRole`, `UserStatus`

향후 권장 순서:
1. 로그인 API(비밀번호 해시 + 세션 발급)
2. 역할 기반 접근 제어(RBAC) 미들웨어
3. 주요 API 감사로그(AuditLog) 적재
4. NAS 이중화/백업 정책 적용
