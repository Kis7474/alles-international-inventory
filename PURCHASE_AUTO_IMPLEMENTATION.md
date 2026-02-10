# 매입 자동생성 기능 구현 완료

## 개요

이 PR은 수입등록 및 매출등록 시 매입(PURCHASE) 레코드를 자동으로 생성하는 기능을 구현합니다. 
이를 통해 `/sales` 화면에서 매입과 매출을 함께 확인할 수 있으며, 전체 거래 흐름을 명확하게 추적할 수 있습니다.

## 핵심 원칙

> **모든 거래는 `/sales`에 매입(PURCHASE) + 매출(SALES)이 쌍으로 기록된다**

## 주요 변경사항

### 1. 데이터베이스 스키마 변경

**prisma/schema.prisma** - SalesRecord 모델에 새 필드 추가:

```prisma
model SalesRecord {
  // ... 기존 필드 ...
  
  // 매입-매출 연동 (NEW)
  linkedSalesId    Int?          @unique // 이 매입에 연동된 매출 ID
  linkedSalesRecord SalesRecord? @relation("LinkedPurchase", fields: [linkedSalesId], references: [id], onDelete: SetNull)
  linkedPurchases  SalesRecord[] @relation("LinkedPurchase") // 이 매출에 연동된 매입들
  
  // 수입등록 연동 (NEW)
  importExportId Int? // 수입등록에서 자동생성된 경우
  
  // costSource에 새 값 추가: 'IMPORT_AUTO', 'INBOUND_AUTO', 'SALES_AUTO'
}
```

### 2. 백엔드 API 변경

#### 신규 파일: `lib/purchase-auto.ts`
매입 레코드 자동생성을 위한 유틸리티 함수:
- `createAutoPurchaseRecord()` - 매입 레코드 생성
- `deleteAutoPurchaseByImportId()` - 수입등록 ID로 연동 매입 삭제
- `deleteAutoPurchaseBySalesId()` - 매출 ID로 연동 매입 삭제

#### 수정된 API:

**app/api/import-export/route.ts**
- POST: 수입등록 시 각 품목에 대해 매입 레코드 자동생성
- PUT: 수입등록 수정 시 기존 매입 삭제 후 재생성
- DELETE: 수입등록 삭제 시 연동된 매입도 함께 삭제

**app/api/sales/route.ts**
- POST: 매출등록 시 매입도 동시 생성 (1:1 대응)
- DELETE: 매출 삭제 시 연동된 매입도 함께 삭제

**app/api/products/route.ts**
- 검색 필터에 case-insensitive 모드 추가
- purchaseVendorId 필터 추가

### 3. 프론트엔드 변경

**app/sales/new/page.tsx** - 매출 등록 화면
- 매입가 오버라이드 필드 추가
- 품목 선택 시 기본 매입가 자동 설정
- 매출 등록 시 확인 메시지: "매입가 ₩XXX으로 매입도 동시 등록됩니다"

**app/sales/page.tsx** - 매입매출 목록
- 삭제 시 확인 메시지: "매출과 연동된 매입 기록도 함께 삭제됩니다"

**app/sales/[id]/page.tsx** - 매입매출 수정
- vendorId, productId 필드 추가하여 수정 시에도 정보 유지

**app/master/products/page.tsx** - 품목 마스터
- 매입 거래처 필터 추가
- 검색창에서 Enter 키 지원

### 4. 데이터 마이그레이션

**scripts/backfill-purchase-records.ts**
기존 수입등록 데이터에 대해 매입 레코드를 소급 생성하는 스크립트

## 작동 방식

### 수입등록 → 매입 자동생성

```
수입등록 (IMPORT)
  ↓
다중 품목인 경우:
  품목 A: 매입 레코드 생성 (costSource: 'IMPORT_AUTO')
  품목 B: 매입 레코드 생성 (costSource: 'IMPORT_AUTO')
  ...

단일 품목인 경우:
  품목: 매입 레코드 생성 (costSource: 'IMPORT_AUTO')

매입 단가 = (unitPrice × exchangeRate) + 비례 배분된 추가 비용
```

### 매출등록 → 매입 자동생성

```
매출등록 (SALES)
  ↓
조건: productId 존재 && purchaseVendorId 존재
  ↓
매입 레코드 생성 (costSource: 'SALES_AUTO')
  - linkedSalesId: 매출 ID
  - unitPrice: purchasePriceOverride || defaultPurchasePrice
```

### 삭제 시 연동 삭제

```
수입등록 삭제
  ↓
importExportId로 연동된 모든 매입 레코드 삭제

매출 삭제
  ↓
linkedSalesId로 연동된 매입 레코드 삭제
```

## 배포 방법

### 1. 데이터베이스 마이그레이션

```bash
# Prisma 스키마 변경 적용
npx prisma migrate dev --name add_purchase_auto_fields
```

### 2. 기존 데이터 소급 적용

```bash
# 기존 수입등록에 대한 매입 레코드 생성
npx tsx scripts/backfill-purchase-records.ts
```

### 3. 애플리케이션 배포

```bash
npm run build
npm start
```

## 주의사항

### 필수 필드 처리
- `SalesRecord.salespersonId`와 `categoryId`는 NOT NULL
- 수입등록에서 salespersonId가 없으면 기본값(ID=1) 사용
- Product에서 categoryId가 없으면 기본값(ID=1) 사용

### costSource 값
자동생성된 매입 레코드는 다음 값으로 식별:
- `IMPORT_AUTO`: 수입등록에서 자동생성
- `SALES_AUTO`: 매출등록에서 자동생성
- `INBOUND_AUTO`: 입고등록에서 자동생성 (향후 구현 예정)

### 연동 관계
- 수입-매입: `importExportId` (1:N)
- 매출-매입: `linkedSalesId` (1:1, unique)

## 테스트 체크리스트

- [ ] 수입등록 생성 시 매입 레코드 자동생성 확인
- [ ] 수입등록 수정 시 매입 레코드 업데이트 확인
- [ ] 수입등록 삭제 시 매입 레코드도 삭제 확인
- [ ] 매출등록 생성 시 매입 레코드 자동생성 확인
- [ ] 매출등록 삭제 시 매입 레코드도 삭제 확인
- [ ] 품목 검색 필터 (대소문자 무시, 거래처 필터) 확인
- [ ] 매입가 오버라이드 기능 확인
- [ ] 삭제 시 확인 메시지 표시 확인
- [ ] 매입매출 수정 시 vendorId/productId 유지 확인

## 관련 파일

### Backend
- `lib/purchase-auto.ts` (신규)
- `app/api/import-export/route.ts` (수정)
- `app/api/sales/route.ts` (수정)
- `app/api/products/route.ts` (수정)

### Frontend
- `app/sales/new/page.tsx` (수정)
- `app/sales/page.tsx` (수정)
- `app/sales/[id]/page.tsx` (수정)
- `app/master/products/page.tsx` (수정)

### Database
- `prisma/schema.prisma` (수정)

### Scripts
- `scripts/backfill-purchase-records.ts` (신규)

## 문의

구현 관련 문의사항이나 이슈가 있으면 PR 코멘트로 남겨주세요.
