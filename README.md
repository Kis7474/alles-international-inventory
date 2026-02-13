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
- **PostgreSQL** (Supabase)

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

**로컬 개발 (SQLite 사용)**
```bash
# .env 파일 내용
DATABASE_URL="file:./dev.db"
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

## 클라우드 배포 (Vercel + Neon PostgreSQL)

여러 컴퓨터에서 2-3명이 동시에 사용하려면 클라우드에 배포하세요.

### 아키텍처
- **Vercel**: Next.js 앱 호스팅 (무료 플랜)
- **Neon**: PostgreSQL 데이터베이스 (무료 512MB)

### Step 1: Neon 데이터베이스 생성

1. **Neon 가입 및 프로젝트 생성**
   - https://neon.tech 접속 및 가입
   - 새 프로젝트 생성
   - Region 선택: **Singapore** 권장 (한국과 가장 가까움)
   - Database name: `alles_inventory` (원하는 이름)

2. **연결 URL 복사**
   - 프로젝트 대시보드에서 **Connection String** 복사
   - 형식: `postgresql://username:password@host/database?sslmode=require`
   - 이 URL을 안전하게 보관하세요 (다음 단계에서 사용)

### Step 2: Vercel 배포

1. **Vercel 가입**
   - https://vercel.com 접속 및 가입
   - GitHub 계정으로 로그인 권장

2. **프로젝트 Import**
   - Vercel 대시보드에서 "Add New" → "Project" 클릭
   - GitHub 저장소 선택: `Kis7474/alles-international-inventory`
   - Import 클릭

3. **환경 변수 설정**
   - "Environment Variables" 섹션에서 다음 추가:
   ```
   Name: DATABASE_URL
   Value: postgresql://username:password@host/database?sslmode=require
   ```
   - Step 1에서 복사한 Neon 연결 URL을 Value에 붙여넣기
   - "Add" 클릭

4. **배포 시작**
   - "Deploy" 버튼 클릭
   - 빌드 및 배포 완료 대기 (약 2-3분)
   - 배포 완료 시 제공되는 URL 확인 (예: `https://your-app.vercel.app`)

### Step 3: 데이터베이스 초기화

배포 완료 후 데이터베이스 테이블을 생성해야 합니다.

**방법 1: 로컬에서 초기화 (권장)**
```bash
# .env 파일에 Neon 연결 URL 추가
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# Prisma로 데이터베이스 스키마 생성
npx prisma db push

# 확인
npx prisma studio
```

**방법 2: Vercel CLI 사용**
```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# Vercel 프로젝트 연결
vercel link

# 환경 변수와 함께 Prisma 실행
vercel env pull .env.local
npx prisma db push
```

### Step 4: 접속 및 사용

1. **브라우저에서 접속**
   - Vercel에서 제공한 URL로 접속 (예: `https://your-app.vercel.app`)
   - 팀원들과 URL 공유

2. **멀티유저 사용**
   - 동일한 URL로 여러 명이 동시 접속 가능
   - 2-3명까지 무료 플랜으로 충분히 사용 가능
   - 데이터는 Neon PostgreSQL에 중앙 저장

### 주의사항

- **환경 변수 보안**: DATABASE_URL은 절대 GitHub에 커밋하지 마세요
- **무료 플랜 제한**: 
  - Neon: 512MB 스토리지, 무제한 연결
  - Vercel: 월 100GB 대역폭, 무제한 배포
- **백업**: 중요한 데이터는 정기적으로 백업하세요
- **로컬 개발**: 로컬에서는 SQLite(`file:./dev.db`)를 계속 사용 가능

### 업데이트 배포

코드 변경 후:
```bash
git add .
git commit -m "기능 추가"
git push
```
- GitHub에 푸시하면 Vercel이 자동으로 재배포합니다

### 문제 해결

**데이터베이스 연결 실패 시**
- Neon 연결 URL이 정확한지 확인
- `?sslmode=require` 파라미터가 포함되어 있는지 확인
- Vercel 환경 변수가 올바르게 설정되었는지 확인

**빌드 실패 시**
- Vercel 빌드 로그 확인
- `postinstall` 스크립트가 실행되는지 확인
- Prisma 버전 호환성 확인

**성능 이슈 시**
- Neon 대시보드에서 쿼리 성능 모니터링
- 필요시 인덱스 추가 고려

## 데이터베이스 스키마

시스템은 총 27개의 모델로 구성되어 있습니다:

### 통합 마스터 데이터 (5개)
1. **Product** - 통합 품목 마스터
   - 품목코드, 이름, 단위, 유형(PRODUCT/MATERIAL/PART)
   - 카테고리, 매입거래처
   - 기본 매입가/매출가
   - 현재 원가 (창고료 포함)

2. **Vendor** - 거래처
   - 거래처코드, 이름
   - 유형 (DOMESTIC_PURCHASE/SALES, INTERNATIONAL_PURCHASE/SALES)
   - 연락처, 통화(KRW/USD)

3. **Category** - 카테고리
   - 카테고리코드, 이름, 한글명

4. **Salesperson** - 담당자
   - 담당자코드, 이름, 수수료율

5. **VendorProductPrice** - 거래처별 특별가
   - 거래처별 매입가/매출가
   - 적용일자

### 매입매출 (1개)
6. **SalesRecord** - 매입매출 기록
   - 일자, 유형(PURCHASE/SALES)
   - 담당자, 카테고리, 품목, 거래처
   - 수량, 단가, 금액, 원가, 마진, 마진율
   - 연동 매출/수입수출 ID

### 수입/수출 (4개)
7. **ImportExport** - 수입/수출 건
8. **ImportExportItem** - 수입/수출 품목 상세
9. **ExchangeRate** - 환율
10. **SystemSetting** - 시스템 설정

### 창고 관리 (6개)
11. **Item** - 품목 (하위호환용)
12. **InventoryLot** - 재고 LOT
13. **InventoryMovement** - 입출고 이력
14. **StorageExpense** - 창고료
15. **WarehouseFee** - 창고료 청구
16. **WarehouseFeeDistribution** - 창고료 배분

### 품목 분리 (3개)
17. **Material** - 자재
18. **Part** - 부품
19. **Service** - 서비스

### 프로젝트 (2개)
20. **Project** - 프로젝트
21. **ProjectItem** - 프로젝트 품목

### 통관 관리 (1개)
22. **CustomsTracking** - 통관 추적 (UNI-PASS 연동)

### 문서 관리 (4개)
23. **Quotation** - 견적서
24. **QuotationItem** - 견적서 품목
25. **TransactionStatement** - 거래명세서
26. **TransactionStatementItem** - 거래명세서 품목

### 하위 호환 (3개)
27. **ProductPriceHistory** - 품목 가격 이력
28. **ProductMonthlyCost** - 품목 월별 원가
29. **SalesProduct** - 매출 품목 (레거시)

## 페이지 구조

### 매입/매출
- `/` - 대시보드
- `/sales` - 상세내역
- `/sales/new` - 거래 등록
- `/sales/report/monthly` - 월별 리포트
- `/sales/report/yearly` - 연도별 리포트

### 수입/수출
- `/import-export` - 수입/수출 내역
- `/import-export/new` - 수입/수출 등록
- `/customs/tracking` - 통관 추적
- `/exchange-rates` - 환율 관리

### 재고 관리
- `/warehouse/lots` - 입고 관리
- `/warehouse/outbound` - 출고 관리
- `/warehouse/inventory` - 재고 조회
- `/warehouse/warehouse-fee` - 창고료 관리

### 프로젝트
- `/projects` - 프로젝트 목록
- `/projects/new` - 프로젝트 등록
- `/projects/report` - 프로젝트 리포트

### 문서 관리
- `/documents` - 문서 대시보드
- `/documents/quotation` - 견적서
- `/documents/transaction-statement` - 거래명세서

### 설정
- `/sales/vendors` - 거래처
- `/master/products` - 품목관리
- `/master/services` - 서비스
- `/categories` - 카테고리
- `/salesperson` - 담당자
- `/master/vendor-prices` - 가격
- `/settings/unipass` - 유니패스 설정
- `/master/upload` - 엑셀 업로드

## API 엔드포인트

### 매입/매출
- `/api/sales` - 매입매출 CRUD
- `/api/sales/export` - 엑셀 다운로드
- `/api/sales/report/monthly` - 월별 리포트
- `/api/sales/report/yearly` - 연도별 리포트
- `/api/products/latest-price` - 최근 거래 단가 조회

### 마스터 데이터
- `/api/products` - 품목 CRUD
- `/api/vendors` - 거래처 CRUD
- `/api/categories` - 카테고리 CRUD
- `/api/salesperson` - 담당자 CRUD
- `/api/vendor-product-prices` - 거래처별 가격

### 수입/수출
- `/api/import-export` - 수입/수출 CRUD
- `/api/exchange-rates` - 환율 CRUD

### 재고
- `/api/lots` - 입고 관리
- `/api/outbound` - 출고 관리
- `/api/inventory` - 재고 조회
- `/api/warehouse-fee` - 창고료
- `/api/storage-expenses` - 창고비용

### 프로젝트
- `/api/projects` - 프로젝트 CRUD
- `/api/projects/report` - 프로젝트 리포트

### 문서
- `/api/documents/quotation` - 견적서 CRUD
- `/api/documents/transaction-statement` - 거래명세서 CRUD

### 통관
- `/api/customs/tracking` - 통관 추적
- `/api/unipass/*` - UNI-PASS API 연동

### 기타
- `/api/materials` - 자재
- `/api/parts` - 부품
- `/api/services` - 서비스
- `/api/upload/excel` - 엑셀 업로드
- `/api/items` - 품목 (하위호환)

## 핵심 구현 로직

### 스마트 단가 자동 적용
```typescript
우선순위:
1. 최근 거래 단가: 동일 품목 + 동일 거래처 + 동일 거래유형의 가장 최근 거래 단가
2. 거래처별 특별가: VendorProductPrice 테이블의 거래처별 지정 단가
3. 기본 단가: Product.defaultPurchasePrice (매입) / defaultSalesPrice (매출)
4. 0: 수동 입력 필요
```

### FIFO 출고 처리
```typescript
1. 해당 품목의 잔량이 있는 LOT을 입고일 오름차순으로 조회
2. 필요 수량만큼 순차적으로 LOT에서 차감
   - LOT 잔량 < 출고 요청량: LOT 전체 차감 후 다음 LOT 처리
   - LOT 잔량 >= 출고 요청량: 필요한 만큼만 차감
3. 각 LOT별로 InventoryMovement 생성
4. 출고된 LOT 목록 및 원가 반환
```

### 원가 계산
```typescript
기본 원가 = (물품대금 + 수입통관료 + 입고운송료 + 기타비용) / 입고수량
최종 원가 = 기본 원가 + 창고료 배분액
```

### 마진 계산
```typescript
마진 = 매출액 - 매입원가
마진율 = (마진 / 매출액) × 100
```

### 환율 적용
```typescript
원화금액 = 외화금액 × 환율
환율은 ExchangeRate 테이블에서 조회하거나 수동 입력
```

### 엑셀 업로드 처리
```typescript
1. 엑셀 파일 파싱 (14컬럼 또는 16컬럼 자동 감지)
2. 거래처/품목/담당자/카테고리 자동 생성 (옵션)
3. 거래 내역 일괄 등록
4. 품목 기본가격 자동 업데이트
5. 거래처별 특별가 자동 생성
```

## 엑셀 업로드 양식

### 새 양식 (16컬럼) - 권장
```
날짜 | 구분 | 카테고리 | 품목명 | 단위 | 수량 | 단가 | 공급가액 | 부가세 | 합계(VAT포함) | 거래처 | 거래처유형 | 담당자 | 매입가 | 매입처 | 비고
```

**주요 특징:**
- 단위 입력 가능 (EA, BOX, kg 등)
- 공급가액/부가세 분리 입력
- 거래처유형 명시 가능 (DOMESTIC_SALES, DOMESTIC_PURCHASE, INTERNATIONAL_SALES, INTERNATIONAL_PURCHASE)
- 비고 입력 가능
- 미입력 항목 자동 계산

### 구 양식 (14컬럼) - 하위 호환
```
날짜 | 구분 | 판매처 | 품목명 | 수량 | 판매단가 | 금액(부가세포함) | 금액 | 담당자 | 카테고리 | 마진 | 마진율 | 매입처 | 매입가
```

**참고:**
- 두 양식 모두 지원 (자동 감지)
- 새 양식 사용 권장

## 프로젝트 구조

```
alles-international-inventory/
├── app/
│   ├── api/                          # API 라우트
│   │   ├── sales/                    # 매입매출 API
│   │   ├── import-export/            # 수입/수출 API
│   │   ├── products/                 # 품목 API
│   │   ├── vendors/                  # 거래처 API
│   │   ├── warehouse/                # 재고 API
│   │   ├── projects/                 # 프로젝트 API
│   │   ├── documents/                # 문서 API
│   │   ├── customs/                  # 통관 API
│   │   └── upload/                   # 업로드 API
│   ├── sales/                        # 매입매출 페이지
│   ├── import-export/                # 수입/수출 페이지
│   ├── warehouse/                    # 재고 페이지
│   ├── projects/                     # 프로젝트 페이지
│   ├── documents/                    # 문서 페이지
│   ├── master/                       # 마스터 데이터 페이지
│   ├── layout.tsx                    # 루트 레이아웃
│   └── page.tsx                      # 대시보드
├── components/
│   ├── Sidebar.tsx                   # 네비게이션 사이드바
│   └── ui/                           # UI 컴포넌트
├── lib/
│   ├── prisma.ts                     # Prisma 클라이언트
│   ├── utils.ts                      # 유틸리티 함수
│   └── excel-parser.ts               # 엑셀 파서
├── prisma/
│   └── schema.prisma                 # 데이터베이스 스키마
├── .env                              # 환경 변수
├── package.json
├── tsconfig.json
└── README.md
```

## 화면 구성

### 레이아웃
- 좌측 고정 사이드바 네비게이션
- 반응형 디자인 (모바일 햄버거 메뉴)
- 깔끔한 비즈니스 UI

### 주요 페이지
1. **대시보드 (/)** - 매출/마진 현황 요약
2. **/sales** - 매입매출 상세내역
3. **/import-export** - 수입/수출 관리
4. **/warehouse/lots** - 입고 관리
5. **/warehouse/outbound** - 출고 관리
6. **/warehouse/inventory** - 재고 조회
7. **/projects** - 프로젝트 관리
8. **/documents** - 문서 관리

## 데이터 무결성

- 외래키 관계 설정으로 데이터 일관성 보장
- 음수 수량/금액 입력 방지
- 재고 부족 시 출고 자동 차단
- 품목 코드 중복 방지
- 입고 이력이 있는 품목 삭제 차단
- 트랜잭션 처리로 데이터 일관성 유지

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# Prisma Studio (데이터베이스 GUI)
npx prisma studio

# 데이터베이스 스키마 동기화
npx prisma db push

# Prisma 클라이언트 재생성
npx prisma generate
```

## 특수 기능

### UNI-PASS 통관 정보 연동
- 관세청 UNI-PASS API를 통한 실시간 통관 정보 조회
- B/L 번호 기반 화물 진행 상황 추적
- 수입신고 정보 자동 조회
- 통관 단계별 상태 표시

### 자동 원가 계산
- 수입 비용 자동 집계
- 창고료 재고 배분
- 월별 원가 이력 추적
- FIFO 기반 출고 원가 계산

### 거래명세서 자동 생성
```typescript
매출 내역 선택 → 거래명세서 생성 시 자동 처리:
- 품목/금액 자동 집계
- 거래처 정보 자동 채움 (이름, 전화번호)
- PDF/엑셀 다운로드
```

## 배포 가이드 (Vercel + Supabase PostgreSQL)

### 1. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com)에 가입하고 새 프로젝트 생성
2. 프로젝트 설정에서 Database connection string 복사
   - Settings > Database > Connection String
   - Transaction pooler 모드 사용 (포트 6543)
   - 예시: `postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

### 2. Vercel 배포

1. GitHub 리포지토리와 Vercel 연동
2. 환경 변수 설정:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
   DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
   KOREAEXIM_API_KEY=your_api_key (선택사항)
   UNIPASS_API_KEY=your_unipass_key (선택사항)
   ```
3. 배포 실행

### 3. 데이터베이스 마이그레이션

배포 후 데이터베이스 스키마를 동기화합니다:

**방법 1: 로컬에서 실행**
```bash
# DATABASE_URL을 .env 파일에 추가
npx prisma db push
```

**방법 2: Supabase SQL Editor에서 직접 실행**
1. Prisma 스키마 기반 SQL 생성
   ```bash
   npx prisma migrate dev --name init --create-only
   ```
2. 생성된 SQL을 Supabase SQL Editor에 복사하여 실행

### 4. 배포 후 확인사항

- [ ] Vercel 빌드가 성공적으로 완료되었는지 확인
- [ ] 대시보드 페이지가 정상적으로 로드되는지 확인
- [ ] API 엔드포인트가 정상적으로 응답하는지 확인
- [ ] 데이터베이스 연결이 정상적으로 작동하는지 확인
- [ ] 엑셀 업로드 기능이 정상 작동하는지 확인

### 5. 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/Kis7474/alles-international-inventory.git
cd alles-international-inventory

# 의존성 설치
npm install

# 환경변수 설정 (.env 파일 생성)
DATABASE_URL="postgresql://localhost:5432/alles_inventory"
DIRECT_URL="postgresql://localhost:5432/alles_inventory"

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma db push

# 개발 서버 실행
npm run dev
```

### 6. 문제 해결

**데이터베이스 연결 실패**
- Supabase connection string이 올바른지 확인
- Transaction pooler 모드 (포트 6543) 사용 확인
- 환경변수가 Vercel에 올바르게 설정되어 있는지 확인

**빌드 실패**
- `package.json`의 build 스크립트에 `prisma generate`가 포함되어 있는지 확인
- Node.js 버전 호환성 확인 (Node.js 18 이상 권장)

**엑셀 업로드 타임아웃**
- Vercel의 serverless function timeout은 기본 10초
- 대량 데이터 업로드 시 Vercel Pro 플랜 필요 (최대 60초)
- 또는 데이터를 청크 단위로 분할 업로드

**UNI-PASS API 오류**
- API 키가 올바른지 확인
- 환경 변수에 UNIPASS_API_KEY 설정 확인
- API 사용량 제한 확인

## 환경 변수

```bash
# 필수
DATABASE_URL="postgresql://..."          # Supabase connection string (pooler)
DIRECT_URL="postgresql://..."            # Supabase direct connection (for migrations)

# 선택사항
KOREAEXIM_API_KEY="your_api_key"        # 한국수출입은행 환율 API
UNIPASS_API_KEY="your_api_key"          # 관세청 UNI-PASS API
```

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

