# 통합 마스터 데이터 시스템 구현 가이드

## 개요

이 문서는 매입매출장부, 수입/수출, 창고관리 시스템의 통합 마스터 데이터 구조 구현에 대한 가이드입니다.

## 주요 변경사항

### 1. 데이터베이스 스키마

#### 통합 마스터 모델

**Product (통합 품목 마스터)**
- 모든 모듈에서 사용하는 통합 품목 마스터
- 기본 매입가/매출가 저장
- 카테고리 연결
- 거래처별 특별가 지원

**Vendor (거래처)**
- 국내/해외 거래처 구분
- 통화, 국가 정보 추가
- 연락처 정보 확장

**Category (카테고리)**
- ProductCategory를 Category로 통합
- 모든 모듈에서 공통 사용

**Salesperson (담당자)**
- 모든 모듈에서 공통 사용
- 커미션율 관리

#### 새로운 모델

**VendorProductPrice**
- 거래처별 품목 특별가격 관리
- 적용일자 기준 가격 이력

**ProductPriceHistory**
- 품목 기본 가격 이력 관리

**ImportExport**
- 수입/수출 거래 관리
- 외화 거래 지원
- 환율 자동 계산
- 수입 원가 계산

**ExchangeRate**
- 통화별 환율 관리
- 일자별 환율 이력

### 2. API Routes

#### 새로운 API

- `GET/POST/PUT/DELETE /api/products` - 통합 품목 CRUD
- `GET/POST/PUT/DELETE /api/vendor-product-prices` - 거래처별 가격 관리
- `GET/POST/PUT/DELETE /api/import-export` - 수입/수출 관리
- `GET/POST/PUT/DELETE /api/exchange-rates` - 환율 관리

#### 업데이트된 API

- `/api/vendors` - type, country, currency 필드 추가
- `/api/categories` - 통합 Category 모델 지원

### 3. 페이지

#### 새로운 페이지

- `/master/products` - 통합 품목 관리
- `/master/vendor-prices` - 거래처별 가격 관리
- `/import-export` - 수입/수출 목록
- `/exchange-rates` - 환율 관리

### 4. 유틸리티 함수

#### formatCurrency

```typescript
formatCurrency(amount: number, currency: string = 'KRW'): string
```

- 통화별 금액 포맷팅
- 지원 통화: KRW(₩), USD($), EUR(€), JPY(¥), CNY(¥)
- 원화와 엔화는 정수로, 기타 통화는 소수점 2자리

**사용 예시:**
```typescript
formatCurrency(1000000)           // "₩1,000,000"
formatCurrency(1234.56, 'USD')    // "$1,234.56"
formatCurrency(1000, 'EUR')       // "€1,000.00"
```

#### calculateVat

```typescript
calculateVat(amount: number, vatIncluded: boolean): {
  supplyAmount: number
  vatAmount: number
  totalAmount: number
}
```

- 부가세 자동 계산 (한국 VAT 10%)
- vatIncluded = true: 부가세 포함 금액에서 역산
- vatIncluded = false: 부가세 별도 계산

**사용 예시:**
```typescript
calculateVat(110000, true)
// { supplyAmount: 100000, vatAmount: 10000, totalAmount: 110000 }

calculateVat(100000, false)
// { supplyAmount: 100000, vatAmount: 10000, totalAmount: 110000 }
```

#### calculateImportCost

```typescript
calculateImportCost(data: {
  goodsAmount: number      // 외화
  exchangeRate: number
  dutyAmount: number       // 원화
  shippingCost: number     // 원화
  otherCost: number        // 원화
  quantity: number
}): {
  totalCost: number
  unitCost: number
  krwGoodsAmount: number
}
```

- 수입 원가 계산
- 총 원가 = (물품대금 × 환율) + 관세 + 운송료 + 기타비용

**사용 예시:**
```typescript
calculateImportCost({
  goodsAmount: 1000,      // $1,000
  exchangeRate: 1300,     // 1달러 = 1,300원
  dutyAmount: 50000,      // 관세 50,000원
  shippingCost: 30000,    // 운송료 30,000원
  otherCost: 20000,       // 기타 20,000원
  quantity: 100,          // 100개
})
// {
//   totalCost: 1,400,000,    // 총 원가
//   unitCost: 14,000,        // 단위 원가
//   krwGoodsAmount: 1,300,000 // 물품대금(원화)
// }
```

## 가격 조회 우선순위

거래 시 가격 조회 순서:

1. **거래처별 특별가** (VendorProductPrice)
   - 해당 거래처의 해당 품목에 대한 특별가
   - 적용일자 기준 가장 최근 가격

2. **품목 기본 이력가** (ProductPriceHistory)
   - 품목의 가격 변동 이력
   - 적용일자 기준 가장 최근 가격

3. **품목 기본 단가** (Product.defaultPurchasePrice / defaultSalesPrice)
   - 품목의 기본 매입가/매출가

## 부가세 처리

### SalesRecord와 ImportExport 모델에 추가된 필드:

- `vatIncluded: Boolean` - 부가세 포함 여부
- `supplyAmount: Float` - 공급가액
- `vatAmount: Float` - 부가세액
- `totalAmount: Float` - 합계 (공급가액 + 부가세)

### 자동 계산 예시:

**부가세 포함 ₩110,000**
- 공급가액: ₩100,000
- 부가세: ₩10,000
- 합계: ₩110,000

**부가세 별도 ₩100,000**
- 공급가액: ₩100,000
- 부가세: ₩10,000
- 합계: ₩110,000

## 수입/수출 관리

### 주요 기능

1. **외화 거래 지원**
   - currency: USD, EUR, JPY, CNY 등
   - exchangeRate: 환율 (직접 입력 또는 환율 관리에서 조회)
   - foreignAmount: 외화 금액
   - krwAmount: 원화 환산 금액 (자동 계산)

2. **수입 원가 계산**
   - goodsAmount: 물품대금 (외화)
   - dutyAmount: 관세 (원화)
   - shippingCost: 운송료 (원화)
   - otherCost: 기타 비용 (원화)
   - totalCost: 총 원가 (자동 계산)
   - unitCost: 단위 원가 (자동 계산)

3. **보관 옵션**
   - WAREHOUSE: 창고입고 → 자동으로 InventoryLot 생성
   - OFFICE: 사무실보관 → 재고만 추적, 창고료 없음

## 하위 호환성

기존 시스템과의 호환성을 위해 다음 모델들이 유지됩니다:

- **SalesProduct** - 기존 매입매출 품목 (향후 Product로 통합 예정)
- **ProductCategory** - 기존 카테고리 (향후 Category로 통합 예정)

SalesRecord 모델은 두 가지 품목 연결을 모두 지원합니다:
- `productId` - 통합 품목 연결
- `salesProductId` - 기존 매입매출 품목 연결

## 마이그레이션 계획

### 단계 1: 통합 마스터 데이터 구축
- [x] Product, Vendor, Category 모델 생성
- [x] API 및 페이지 구현
- [x] 하위 호환성 유지

### 단계 2: 데이터 마이그레이션 (향후)
- [ ] 기존 SalesProduct → Product 마이그레이션
- [ ] 기존 ProductCategory → Category 마이그레이션
- [ ] 매입매출 데이터 연결 업데이트

### 단계 3: 구모델 제거 (향후)
- [ ] SalesProduct 모델 제거
- [ ] ProductCategory 모델 제거

## 메뉴 구조

```
📊 대시보드

📋 매입매출장부
├── 매입매출 내역
├── 품목별 현황
└── 리포트 ▶
    ├── 월별 리포트
    └── 연도별 리포트

🌐 수입/수출
├── 수입/수출 내역
├── 수입/수출 등록
└── 환율 관리

📦 창고관리
├── 품목 관리
├── 입고 관리
├── 출고 관리
├── 재고 조회
└── 창고료 관리

⚙️ 마스터 관리
├── 품목 관리 (통합)
├── 품목 관리 (매입매출)
├── 담당자 관리
├── 거래처 관리
├── 카테고리 관리
└── 거래처별 가격 관리

📈 리포트
├── 월별 리포트
└── 연도별 리포트
```

## 향후 개발 예정 기능

1. **엑셀 업로드**
   - 거래처별 품목 가격 일괄 등록
   - 품목 마스터 일괄 등록

2. **수입/수출 등록 페이지**
   - 수입/수출 거래 등록 폼
   - 환율 자동 조회
   - 원가 자동 계산

3. **컴포넌트**
   - VatToggle: 부가세 포함/비포함 토글
   - CurrencyDisplay: 통화별 금액 표시
   - ExcelUploader: 엑셀 파일 업로드

## 참고사항

- 모든 금액은 원화 기준으로 저장되며, formatCurrency 함수로 표시 시 통화 기호가 추가됩니다.
- 환율은 수동으로 등록하거나 API를 통해 자동으로 가져올 수 있습니다.
- 부가세는 한국 기준 10%로 고정되어 있습니다.
- 수입 원가 계산 시 모든 비용은 원화로 환산하여 합산됩니다.
