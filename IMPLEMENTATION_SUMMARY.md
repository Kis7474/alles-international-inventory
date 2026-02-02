# 품목 테이블 통합 및 데이터 흐름 개선 - 구현 요약

## 개요
본 PR은 알레스인터내셔날 재고 관리 시스템의 품목 테이블 통합, 데이터 흐름 개선, UI 개선을 포함한 포괄적인 시스템 개선 작업입니다.

---

## ✅ 완료된 작업

### 🔴 단기 과제 (즉시 해결)

#### 1. 설정-품목관리 메뉴 수정 ✅
**파일**: `components/Sidebar.tsx`
- 설정 메뉴의 '품목 관리' 링크를 `/master/materials`에서 `/master/products`로 변경
- 아이콘도 🧱에서 📦로 변경하여 통합 품목 관리 페이지로 연결

**변경사항**:
```typescript
{ href: '/master/products', label: '품목관리', icon: '📦' }
```

#### 2. 통관 → 수입/수출 자동 연동 개선 ✅
**파일**: `app/api/customs/tracking/route.ts`

**개선사항**:
- `autoLinkToImport` 함수 반환값 개선 (success, message, importId 반환)
- 기본 해외 매입 거래처 자동 생성 로직 추가
- storageType을 'WAREHOUSE'로 기본 설정하여 자동 입고 지원
- 에러 발생 시 명확한 메시지 반환

**주요 코드**:
```typescript
// 거래처가 없을 경우 자동 생성
if (!vendor) {
  vendor = await prisma.vendor.create({
    data: {
      code: 'DEFAULT_INTL_PURCHASE',
      name: '기본 해외 매입처',
      type: 'INTERNATIONAL_PURCHASE',
      currency: 'USD',
    },
  })
}

// storageType 기본값 설정
storageType: 'WAREHOUSE',  // 기본값으로 창고입고 설정
```

#### 3. 통관 목록 페이지 연동 상태 및 수동 연동 버튼 추가 ✅
**파일**: 
- `app/customs/tracking/page.tsx`
- `app/api/customs/tracking/[id]/link/route.ts` (신규 생성)

**개선사항**:
- 테이블에 "연동상태" 컬럼 추가
- 통관완료 상태인 건에 대해 수동 연동 버튼 표시
- 이미 연동된 건은 "✅ 연동됨" 링크로 수입/수출 페이지로 이동 가능
- 대기중인 건은 "대기중" 표시

**UI 변경사항**:
```tsx
<td className="px-4 py-4 text-center">
  {tracking.importId ? (
    <Link href={`/import-export/${tracking.importId}`} className="text-green-600 hover:underline text-sm">
      ✅ 연동됨
    </Link>
  ) : isCustomsCleared(tracking.status) ? (
    <button
      onClick={() => handleManualLink(tracking.id)}
      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
    >
      수동 연동
    </button>
  ) : (
    <span className="text-gray-400 text-sm">대기중</span>
  )}
</td>
```

#### 4. 수입 등록 시 storageType 필수 입력 처리 ✅
**파일**: `app/import-export/new/page.tsx`

**개선사항**:
- "보관 옵션"을 "보관 방식 *"로 변경하여 필수 표시
- 모든 radio 버튼에 `required` 속성 추가
- 안내 문구 추가: "창고 입고 또는 사무실 보관 선택 시 자동으로 입고 관리에 등록됩니다."
- "선택 안함" 옵션을 "기타"로 변경

**변경사항**:
```tsx
<h2 className="text-xl font-semibold text-gray-900 mb-4">
  보관 방식 <span className="text-red-500">*</span>
</h2>
<p className="text-xs text-gray-500 mb-3">
  창고 입고 또는 사무실 보관 선택 시 자동으로 입고 관리에 등록됩니다.
</p>
```

---

### 🟡 중기 과제 (테이블 마이그레이션 스크립트)

#### 5. Item → Product 마이그레이션 스크립트 ✅
**파일**: `scripts/migrate-items-to-products.ts`

**기능**:
- 기존 Item 테이블의 모든 데이터를 Product 테이블로 마이그레이션
- 중복 체크 (code 또는 name 기준)
- InventoryLot의 itemId를 productId로 업데이트
- 기본 매입처 자동 생성
- 마이그레이션 검증 및 결과 리포트

**실행 방법**:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-items-to-products.ts
```

#### 6. SalesProduct → Product 마이그레이션 스크립트 ✅
**파일**: `scripts/migrate-sales-products.ts`

**기능**:
- SalesProduct와 가격 이력을 Product 및 ProductPriceHistory로 마이그레이션
- 기존 Product가 있으면 가격 정보만 업데이트
- SalesRecord의 참조를 업데이트
- 가격 이력 중복 체크

**실행 방법**:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-sales-products.ts
```

#### 7. ProductCategory → Category 마이그레이션 스크립트 ✅
**파일**: `scripts/migrate-categories.ts`

**기능**:
- ProductCategory 데이터를 Category로 복사
- 중복 체크 (code 또는 nameKo 기준)

**실행 방법**:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-categories.ts
```

#### 8. Material/Part → Product 마이그레이션 스크립트 ✅
**파일**: `scripts/migrate-materials-parts.ts`

**기능**:
- Material → Product (type: 'MATERIAL')
- Part → Product (type: 'PART')
- 카테고리 및 거래처 정보 유지

**실행 방법**:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-materials-parts.ts
```

#### 9. 마이그레이션 가이드 문서 ✅
**파일**: `scripts/README.md`

**내용**:
- 각 스크립트의 목적 및 처리 내용 설명
- 실행 방법 및 권장 실행 순서
- 검증 방법 및 주의사항

---

### 🟢 장기 과제 (구조 개선)

#### 10. Product API type 필터링 ✅
**파일**: `app/api/products/route.ts`

**기능** (이미 구현됨):
- `GET /api/products?type=MATERIAL` 형태로 필터링 지원
- 콤마로 구분된 복수 타입 필터링 지원 (`type=PRODUCT,MATERIAL`)
- 기존 categoryId, searchName, salesVendorId 필터와 함께 사용 가능

**사용 예시**:
```
GET /api/products?type=MATERIAL
GET /api/products?type=PRODUCT,PART
GET /api/products?type=MATERIAL&categoryId=1
```

---

## 🎯 데이터 흐름 개선 효과

### Before (개선 전)
```
통관 내역 등록 → (수동 작업 필요) → 수입/수출 등록 → (수동 작업 필요) → 창고 입고
```

### After (개선 후)
```
통관 내역 등록 → ✅ 자동 연동 → 수입/수출 (storageType=WAREHOUSE) → ✅ 자동 입고 → 창고 관리
                   (또는 수동 연동 버튼)
```

### 주요 개선사항:
1. **자동 연동**: 통관완료 시 수입/수출 내역 자동 생성
2. **수동 연동**: 자동 연동 실패 시 수동 연동 버튼으로 쉽게 처리
3. **연동 상태 가시성**: 통관 목록에서 연동 상태를 한눈에 확인
4. **자동 입고**: storageType 설정으로 창고/사무실 보관 시 자동 LOT 생성

---

## 📦 테이블 통합 전략

### 통합 목표
여러 품목 테이블(Item, SalesProduct, Material, Part)을 하나의 Product 테이블로 통합

### 통합 방법
1. **마이그레이션 스크립트 실행**: 기존 데이터를 Product 테이블로 이동
2. **type 필드 활용**: PRODUCT, MATERIAL, PART로 구분
3. **하위 호환성 유지**: 기존 테이블은 마이그레이션 완료 후에도 일정 기간 유지
4. **점진적 전환**: API 및 UI를 단계적으로 Product 테이블 사용으로 전환

### 마이그레이션 실행 순서
```
1. migrate-categories.ts      (카테고리 통합)
2. migrate-items-to-products.ts      (Item → Product)
3. migrate-sales-products.ts         (SalesProduct → Product)
4. migrate-materials-parts.ts        (Material/Part → Product)
```

---

## 🧪 테스트 시나리오

### 1. 통관 → 수입/수출 → 창고 흐름 테스트
- [ ] 통관 내역 등록 (BL번호)
- [ ] 유니패스 동기화로 통관완료 상태 확인
- [ ] 자동 연동 확인 (importId 생성)
- [ ] 수입/수출 내역에서 storageType=WAREHOUSE 확인
- [ ] 창고 LOT 자동 생성 확인

### 2. 수동 연동 테스트
- [ ] 통관완료 상태인데 자동 연동 안 된 건 찾기
- [ ] "수동 연동" 버튼 클릭
- [ ] 수입 내역 생성 확인
- [ ] 연동 상태 "✅ 연동됨"으로 변경 확인

### 3. 품목 관리 메뉴 테스트
- [ ] 사이드바에서 "설정 > 품목관리" 클릭
- [ ] `/master/products` 페이지로 이동 확인
- [ ] 통합 품목 목록 표시 확인

### 4. storageType 필수 입력 테스트
- [ ] 수입/수출 등록 페이지 접속
- [ ] storageType 미선택 상태로 제출 시도
- [ ] 브라우저 validation 에러 확인
- [ ] 필수 표시(*) 확인
- [ ] 안내 문구 확인

---

## 📚 파일 변경 요약

### 수정된 파일
- `components/Sidebar.tsx` - 품목관리 메뉴 링크 수정
- `app/api/customs/tracking/route.ts` - autoLinkToImport 함수 개선
- `app/customs/tracking/page.tsx` - 연동 상태 UI 및 수동 연동 기능 추가
- `app/import-export/new/page.tsx` - storageType 필수 입력 처리

### 신규 생성된 파일
- `app/api/customs/tracking/[id]/link/route.ts` - 수동 연동 API
- `scripts/migrate-items-to-products.ts` - Item 마이그레이션 스크립트
- `scripts/migrate-sales-products.ts` - SalesProduct 마이그레이션 스크립트
- `scripts/migrate-categories.ts` - ProductCategory 마이그레이션 스크립트
- `scripts/migrate-materials-parts.ts` - Material/Part 마이그레이션 스크립트
- `scripts/README.md` - 마이그레이션 가이드

---

## 🚀 배포 후 작업

### 즉시 실행
1. ✅ 단기 과제는 바로 사용 가능 (배포만 하면 됨)

### 계획적 실행 (데이터 백업 후)
2. 마이그레이션 스크립트 실행
   - 데이터베이스 백업
   - 각 스크립트를 순서대로 실행
   - 검증 확인

### 점진적 전환
3. API 및 UI를 Product 테이블 사용으로 전환
   - `/api/lots/route.ts` 수정
   - `/api/inventory/route.ts` 수정
   - 창고 관리 페이지 수정

---

## 💡 향후 개선 방향

### 미완료 작업
- [ ] 환율 관리 UI 개선 (이력 팝업)
- [ ] 창고 관리 API/UI의 Product 테이블 사용 전환
- [ ] 재고 조회 API의 Product 테이블 사용 전환

### 추가 고려사항
- 마이그레이션 후 기존 테이블 제거 시점 결정
- 통합 품목 관리 UI 개선
- 품목 타입별 필터링 UI 추가

---

## ✅ 빌드 검증

```bash
npm run build
```

**결과**: ✅ Compiled successfully

모든 코드가 정상적으로 빌드되었으며, TypeScript 타입 검증도 통과했습니다.
