# 마이그레이션 스크립트

이 디렉토리에는 기존 테이블에서 통합 테이블로 데이터를 마이그레이션하는 스크립트가 포함되어 있습니다.

## 실행 방법

```bash
# ts-node로 직접 실행
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-items-to-products.ts
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-sales-products.ts
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-categories.ts
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-materials-parts.ts
```

## 스크립트 설명

### 1. migrate-items-to-products.ts
**목적**: `Item` 테이블 데이터를 통합 `Product` 테이블로 마이그레이션

**처리 내용**:
- 기존 Item 데이터를 조회
- 동일한 code 또는 name이 있는 Product가 있으면 연결만 업데이트
- 없으면 새로운 Product 생성
- InventoryLot의 itemId를 productId로 업데이트
- 기본 매입처가 없으면 자동 생성

**주의사항**:
- 이미 존재하는 Product에 연결하므로 중복 방지
- 실행 전 데이터 백업 권장

### 2. migrate-sales-products.ts
**목적**: `SalesProduct` 테이블 데이터를 통합 `Product` 테이블로 마이그레이션

**처리 내용**:
- SalesProduct와 가격 이력(SalesProductPrice)을 Product로 변환
- 기존 Product가 있으면 가격 정보만 업데이트
- 없으면 새로운 Product 생성 (code: SP-{id})
- 가격 이력을 ProductPriceHistory로 마이그레이션
- SalesRecord의 참조를 업데이트

### 3. migrate-categories.ts
**목적**: `ProductCategory` 테이블을 통합 `Category` 테이블로 마이그레이션

**처리 내용**:
- ProductCategory 데이터를 Category로 복사
- 중복 체크 (code 또는 nameKo 기준)
- 이미 존재하는 카테고리는 스킵

### 4. migrate-materials-parts.ts
**목적**: `Material`과 `Part` 테이블을 통합 `Product` 테이블로 마이그레이션

**처리 내용**:
- Material → Product (type: 'MATERIAL')
- Part → Product (type: 'PART')
- 기존 Product가 있으면 스킵
- 없으면 새로운 Product 생성

## 실행 순서

권장 실행 순서:

1. **migrate-categories.ts** (선택적, Category가 필요한 경우)
2. **migrate-items-to-products.ts** (Item → Product)
3. **migrate-sales-products.ts** (SalesProduct → Product)
4. **migrate-materials-parts.ts** (Material/Part → Product)

## 롤백 방법

마이그레이션 후 문제가 발생한 경우:
- 데이터베이스 백업에서 복원
- 또는 생성된 Product를 수동으로 삭제

## 검증

마이그레이션 후 확인사항:
- [ ] Product 테이블에 데이터가 정상적으로 생성되었는지 확인
- [ ] InventoryLot의 productId가 설정되었는지 확인
- [ ] SalesRecord의 productId가 설정되었는지 확인
- [ ] 가격 이력이 정상적으로 마이그레이션되었는지 확인
- [ ] 기존 데이터와 마이그레이션된 데이터의 일관성 검증

## 온프레/NAS 운영 스크립트

### scripts/onprem/setup-postgres.sh
온프레 PostgreSQL 서버 1대 초기 설치/기본 보안 설정 자동화 스크립트입니다.

```bash
sudo APP_DB=alles_inventory APP_USER=alles_app APP_PASSWORD='StrongPass!' ./scripts/onprem/setup-postgres.sh
```

### scripts/onprem/nas-precheck.sh
앱 서버에서 NAS 마운트 경로의 쓰기 가능 여부 및 권한/용량을 점검합니다.

```bash
NAS_MOUNT=/mnt/nas/alles-inventory/uploads ./scripts/onprem/nas-precheck.sh
```
