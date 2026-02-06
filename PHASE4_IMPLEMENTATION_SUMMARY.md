# Phase 4 구현 완료 보고서

## 개요
Phase 4 "출고→매출 자동연동 + 품목 원가 기반 마진 계산" 기능이 성공적으로 구현되었습니다.

## 구현 사항

### 1. Prisma 스키마 변경 ✅

**InventoryMovement 모델에 추가된 필드:**
- `vendorId` (Int?): 출고 거래처
- `salespersonId` (Int?): 담당자
- `salesRecordId` (Int?): 연동된 매출 기록 (N:1 관계, @unique 없음)
- `outboundType` (String?): 'SALES' | 'OTHER' (판매출고 vs 기타출고)
- `notes` (String?): 비고
- `vendor`, `salesperson`, `salesRecord` relation 추가

**SalesRecord 모델에 추가된 필드:**
- `costSource` (String?): 'PRODUCT_CURRENT' | 'PRODUCT_DEFAULT' | 'MANUAL' | 'OUTBOUND_AUTO'
- `outboundMovements` relation: InventoryMovement[]

**Vendor, Salesperson 모델에 역관계 추가:**
- `inventoryMovements` relation 추가

### 2. 품목 원가 조회 API ✅

**신규 파일:** `/app/api/products/[id]/cost/route.ts`

```typescript
GET /api/products/[id]/cost
반환값: { 
  cost: number,        // 단위 원가 (창고료 포함)
  source: 'CURRENT' | 'DEFAULT' | 'NONE' 
}
```

- `lib/product-cost.ts`의 `getProductCurrentCost()` 함수 활용
- currentCost (창고료 포함) → defaultPurchasePrice → 0 순으로 폴백

### 3. 출고 API 수정 ✅

**파일:** `/app/api/outbound/route.ts`

**POST 요청 수정:**
- 새로운 요청 파라미터: `vendorId`, `salespersonId`, `outboundType`, `notes`
- 판매출고(`outboundType === 'SALES'`) 처리 로직:
  1. 거래처/담당자 필수 검증
  2. FIFO 출고 처리
  3. **동일 트랜잭션 내에서** SalesRecord 자동 생성:
     - `cost` = 수량 × currentCost (총원가)
     - `unitPrice` = VendorProductPrice → defaultSalesPrice → 0
     - `margin` = amount - cost
     - `marginRate` = margin / amount × 100
     - `costSource` = 'OUTBOUND_AUTO'
  4. 생성된 SalesRecord의 id를 InventoryMovement에 저장
- 기타출고(`outboundType === 'OTHER'`): 기존 로직 유지

**GET 요청 수정:**
- `vendor`, `salesperson`, `salesRecord` relation include 추가

**DELETE 요청 수정:**
- SalesRecord 연동 삭제 로직 추가:
  - 해당 salesRecordId를 참조하는 다른 movement가 없으면 SalesRecord도 삭제
  - 벌크 삭제 시에도 동일 로직 적용
- TypeScript 호환성을 위해 `Array.from(new Set(...))` 사용

### 4. 출고 UI 확장 ✅

**파일:** `/app/warehouse/outbound/page.tsx`

**추가된 UI 요소:**

1. **출고 목적 선택:**
   - 라디오 버튼: 판매출고(SALES) / 기타출고(OTHER)
   
2. **판매출고 시 추가 필드:**
   - 거래처 선택 (매출 거래처만 필터: DOMESTIC_SALES, INTERNATIONAL_SALES)
   - 담당자 선택
   
3. **매출가/원가/마진 미리보기:**
   - 단위원가 (currentCost 기반, 출처 표시)
   - 단위매출가 (VendorProductPrice → defaultSalesPrice)
   - 예상 마진 (매출가 - 원가) × 수량
   - 마진율 (%)
   
4. **비고 입력 필드:**
   - 선택적 textarea 필드

5. **출고 이력 테이블 확장:**
   - 출고목적 컬럼 (판매/기타 배지)
   - 거래처 컬럼
   - 담당자 컬럼
   - 연동매출 링크 (SalesRecord ID 클릭 가능)
   
6. **모바일 뷰 업데이트:**
   - 출고목적 배지
   - 거래처/담당자 정보
   - 연동매출 링크

7. **출고 완료 알림:**
   - SalesRecord가 생성된 경우 성공 메시지 표시

**새로운 상태 관리:**
- `vendors`, `salespersons` 목록
- `costPreview`, `pricePreview` 데이터
- `formData.outboundType`, `formData.vendorId`, `formData.salespersonId`, `formData.notes`

### 5. 매출 등록 개선 ✅

**파일:** `/app/sales/new/page.tsx`

**수정 사항:**

1. **🐛 마진 계산 버그 수정:**
   ```typescript
   // 변경 전: cost를 총원가로 사용 (잘못됨)
   const margin = amount - cost
   
   // 변경 후: 단위원가 × 수량으로 총원가 계산
   const totalCost = unitCost * quantity
   const margin = amount - totalCost
   ```

2. **원가 조회 개선:**
   - `product.defaultPurchasePrice` 대신 `/api/products/[id]/cost` API 호출
   - `fetchProductCost()` 함수 추가
   - currentCost (창고료 포함) 우선 사용, 없으면 defaultPurchasePrice로 폴백

3. **레이블 수정:**
   - "원가" → "단위원가"로 명확화

### 6. 매출 API 서버사이드 검증 ✅

**파일:** `/app/api/sales/route.ts`

**POST/PUT 수정:**
- `productId`가 있으면 서버에서 `getProductCurrentCost()` 호출
- 원가 계산: `총원가 = 수량 × currentCost`
- `costSource` 자동 설정:
  - `PRODUCT_CURRENT`: currentCost 사용
  - `PRODUCT_DEFAULT`: defaultPurchasePrice 사용
  - `MANUAL`: 사용자 입력값 사용
  - `OUTBOUND_AUTO`: 출고에서 자동 생성 (출고 API에서 설정)

## 기술적 세부사항

### 데이터베이스 마이그레이션
- Prisma 스키마 변경 완료
- 마이그레이션 파일 생성 필요: `npx prisma migrate dev --name phase4_outbound_sales_linking`
- 운영 환경 적용: `npx prisma migrate deploy`

### 트랜잭션 처리
출고 API의 POST 요청은 다음을 하나의 트랜잭션으로 처리:
1. LOT 잔량 차감 (여러 LOT 가능)
2. InventoryMovement 생성 (여러 개 가능)
3. SalesRecord 생성 (판매출고인 경우만, 1개)

### 원가 계산 로직
1. **currentCost 우선:**
   - 창고료 배분 후 업데이트된 최신 원가
   - 가중평균: Σ(잔량 × 단가 + 창고료) / 총잔량
   
2. **defaultPurchasePrice 폴백:**
   - currentCost가 없는 경우
   
3. **0 또는 사용자 입력:**
   - 위 두 값 모두 없는 경우

### 거래처 필터링
- 판매출고: `type IN ('DOMESTIC_SALES', 'INTERNATIONAL_SALES')`
- 매입: `type IN ('DOMESTIC_PURCHASE', 'INTERNATIONAL_PURCHASE')`

## 호환성 및 안정성

### 하위 호환성
- 기존 출고 이력은 새 필드들이 모두 `null`로 표시
- UI에서 null 값 처리 로직 추가 (배지 미표시, "-" 표시 등)
- 기존 sales/new 페이지는 그대로 동작 (출고 없이 직접 매출 등록 가능)

### 에러 처리
- 판매출고 시 거래처/담당자 필수 검증
- 재고 부족 시 명확한 에러 메시지
- categoryId null 대응 (기본값 1 사용)
- TypeScript 컴파일 에러 해결 (`Array.from(new Set(...))`)

### 주의사항
1. **출고 시 updateProductCurrentCost 호출 안 함:**
   - 원가는 월말 창고료 배분 시에만 업데이트 (Phase 3 설계 유지)
   
2. **N:1 관계:**
   - 하나의 SalesRecord에 여러 InventoryMovement가 연결될 수 있음
   - `salesRecordId`에 `@unique` 제약조건 없음

3. **삭제 로직:**
   - salesRecordId를 참조하는 모든 movement가 삭제될 때만 SalesRecord 삭제
   - 트랜잭션으로 안전하게 처리

## 테스트 체크리스트

### 데이터베이스 마이그레이션
- [ ] 개발 환경에서 `npx prisma migrate dev` 실행
- [ ] 운영 환경에서 `npx prisma migrate deploy` 실행

### 기능 테스트
- [ ] 판매출고 → SalesRecord 자동 생성 확인
- [ ] 기타출고 → SalesRecord 생성 안 됨 확인
- [ ] 매출가/원가/마진 미리보기 정확성 확인
- [ ] 출고 이력 테이블에 새 컬럼 정상 표시
- [ ] 연동매출 링크 클릭 → 매출 상세 페이지 이동 확인
- [ ] 출고 삭제 → 연동된 SalesRecord도 삭제 확인
- [ ] 기존 출고 이력 (null 값) 정상 표시 확인
- [ ] sales/new 페이지에서 원가 자동 계산 확인
- [ ] 마진 계산 수정 사항 확인

### UI 테스트
- [ ] 데스크톱 뷰 정상 작동
- [ ] 모바일 뷰 정상 작동
- [ ] 판매출고/기타출고 전환 시 필드 표시/숨김 확인
- [ ] 거래처 선택 시 매출 거래처만 표시 확인
- [ ] 품목 선택 시 원가/매출가 자동 로드 확인

### 성능 테스트
- [ ] 대량 출고 처리 성능
- [ ] 출고 이력 페이지 로딩 속도
- [ ] API 응답 시간

## 배포 가이드

### 1. 데이터베이스 마이그레이션
```bash
# 개발 환경
npx prisma migrate dev --name phase4_outbound_sales_linking

# 운영 환경
npx prisma migrate deploy
```

### 2. 코드 배포
```bash
git checkout copilot/implement-sales-auto-connection
git pull origin copilot/implement-sales-auto-connection
npm install
npm run build
```

### 3. 환경 변수 확인
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `DIRECT_URL`: 마이그레이션용 직접 연결 문자열

### 4. 배포 후 검증
- 출고 등록 페이지 접근 확인
- 판매출고 생성 → 매출 자동 생성 확인
- 출고 삭제 → 매출 자동 삭제 확인

## 파일 변경 목록

### 신규 파일
- `/app/api/products/[id]/cost/route.ts`

### 수정 파일
- `/prisma/schema.prisma`
- `/app/api/outbound/route.ts`
- `/app/api/sales/route.ts`
- `/app/warehouse/outbound/page.tsx`
- `/app/sales/new/page.tsx`

## 결론

Phase 4 구현이 완료되어 다음 기능들이 추가되었습니다:

1. ✅ 판매출고 시 매출 자동 생성
2. ✅ 창고료 포함 원가 기반 마진 계산
3. ✅ 출고 목적별 분류 (판매/기타)
4. ✅ 거래처별 매출가 자동 적용
5. ✅ 실시간 마진 미리보기
6. ✅ 매출 등록 시 원가 자동 계산 개선

모든 코드는 TypeScript 컴파일 오류 없이 검증되었으며, 하위 호환성과 에러 처리가 완료되었습니다.

운영 환경 배포 시 데이터베이스 마이그레이션을 먼저 실행하고, 충분한 기능 테스트를 진행한 후 사용자에게 공개하는 것을 권장합니다.
