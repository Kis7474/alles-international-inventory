# Phase 4 데이터 흐름도

## 1. 판매출고 프로세스

```
┌─────────────────────────────────────────────────────────────────┐
│                      판매출고 프로세스                             │
└─────────────────────────────────────────────────────────────────┘

사용자 입력 (출고 폼)
├── 품목 선택
├── 수량 입력
├── 출고 목적: SALES (판매출고)
├── 거래처 선택 (매출 거래처만)
├── 담당자 선택
└── 비고 (선택)
         │
         ▼
  ┌──────────────────┐
  │  API 요청        │
  │  POST /outbound  │
  └──────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │          트랜잭션 시작                                │
  ├─────────────────────────────────────────────────────┤
  │  1. FIFO로 LOT 잔량 차감                            │
  │     ├── 가장 오래된 LOT부터 순서대로                │
  │     └── 여러 LOT에서 차감 가능                      │
  │                                                      │
  │  2. 원가 계산                                        │
  │     ├── getProductCurrentCost(productId)            │
  │     └── totalCost = quantity × currentCost          │
  │                                                      │
  │  3. 매출가 조회                                      │
  │     ├── VendorProductPrice 조회                     │
  │     ├── 없으면 → Product.defaultSalesPrice          │
  │     └── 없으면 → 0                                  │
  │                                                      │
  │  4. 마진 계산                                        │
  │     ├── amount = quantity × unitPrice               │
  │     ├── margin = amount - totalCost                 │
  │     └── marginRate = (margin / amount) × 100        │
  │                                                      │
  │  5. SalesRecord 생성                                │
  │     ├── type: 'SALES'                               │
  │     ├── cost: totalCost                             │
  │     ├── costSource: 'OUTBOUND_AUTO'                 │
  │     └── 기타 필드들                                 │
  │                                                      │
  │  6. InventoryMovement 생성 (여러 개)                │
  │     ├── type: 'OUT'                                 │
  │     ├── salesRecordId: (생성된 SalesRecord ID)     │
  │     ├── vendorId, salespersonId, outboundType       │
  │     └── LOT별로 생성                                │
  │                                                      │
  └─────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────┐
  │  트랜잭션 커밋    │
  └──────────────────┘
         │
         ▼
  ┌──────────────────┐
  │  결과 반환        │
  │  + salesRecordId │
  └──────────────────┘
```

## 2. 기타출고 프로세스

```
┌─────────────────────────────────────────────────────────────────┐
│                      기타출고 프로세스                             │
└─────────────────────────────────────────────────────────────────┘

사용자 입력
├── 품목 선택
├── 수량 입력
├── 출고 목적: OTHER (기타출고)
└── 비고 (선택)
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │          트랜잭션 시작                                │
  ├─────────────────────────────────────────────────────┤
  │  1. FIFO로 LOT 잔량 차감                            │
  │                                                      │
  │  2. InventoryMovement 생성                          │
  │     ├── type: 'OUT'                                 │
  │     ├── salesRecordId: null                         │
  │     └── outboundType: 'OTHER'                       │
  │                                                      │
  └─────────────────────────────────────────────────────┘
         │
         ▼
  SalesRecord 생성 안 함
```

## 3. 원가 계산 흐름

```
┌────────────────────────────────────────────────────────┐
│              원가 계산 로직                              │
└────────────────────────────────────────────────────────┘

GET /api/products/[id]/cost
         │
         ▼
  ┌────────────────────────────┐
  │ getProductCurrentCost()    │
  └────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  1. Product.currentCost 조회             │
  │     ├── 창고료 포함된 최신 원가           │
  │     ├── 가중평균 계산됨                   │
  │     └── 월말 창고료 배분 시 업데이트      │
  └─────────────────────────────────────────┘
         │
         ├── 있으면 → { cost: currentCost, source: 'CURRENT' }
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  2. Product.defaultPurchasePrice 조회   │
  │     └── 기본 매입가                      │
  └─────────────────────────────────────────┘
         │
         ├── 있으면 → { cost: defaultPurchasePrice, source: 'DEFAULT' }
         │
         ▼
  { cost: 0, source: 'NONE' }
```

## 4. 매출가 계산 흐름

```
┌────────────────────────────────────────────────────────┐
│              매출가 조회 로직                            │
└────────────────────────────────────────────────────────┘

판매출고 시 (vendorId + productId)
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  1. VendorProductPrice 조회              │
  │     ├── vendorId + productId             │
  │     ├── effectiveDate <= 출고일          │
  │     └── 최신순 정렬                       │
  └─────────────────────────────────────────┘
         │
         ├── 있으면 → VendorProductPrice.salesPrice
         │
         ▼
  ┌─────────────────────────────────────────┐
  │  2. Product.defaultSalesPrice 조회       │
  │     └── 기본 매출가                      │
  └─────────────────────────────────────────┘
         │
         ├── 있으면 → Product.defaultSalesPrice
         │
         ▼
  unitPrice = 0
```

## 5. 삭제 프로세스

```
┌────────────────────────────────────────────────────────┐
│              출고 삭제 로직                              │
└────────────────────────────────────────────────────────┘

DELETE /api/outbound?id=[movement_id]
         │
         ▼
  ┌─────────────────────────────────────────────────────┐
  │          트랜잭션 시작                                │
  ├─────────────────────────────────────────────────────┤
  │  1. InventoryMovement 조회                          │
  │     └── salesRecordId 확인                          │
  │                                                      │
  │  2. InventoryMovement 삭제                          │
  │                                                      │
  │  3. LOT 잔량 복구                                    │
  │     └── quantityRemaining += movement.quantity      │
  │                                                      │
  │  4. SalesRecord 삭제 여부 확인                       │
  │     ├── salesRecordId가 있으면?                     │
  │     ├── 같은 salesRecordId를 참조하는                │
  │     │   다른 movement가 있는지 확인                  │
  │     └── 없으면 → SalesRecord 삭제                   │
  │                                                      │
  └─────────────────────────────────────────────────────┘
         │
         ▼
  ┌──────────────────┐
  │  트랜잭션 커밋    │
  └──────────────────┘
```

## 6. 데이터 관계도

```
┌────────────────────────────────────────────────────────────────┐
│                    데이터 모델 관계                              │
└────────────────────────────────────────────────────────────────┘

Product
  │
  ├── currentCost (창고료 포함 최신 원가)
  ├── defaultSalesPrice (기본 매출가)
  └── defaultPurchasePrice (기본 매입가)
       │
       ▼
VendorProductPrice (거래처별 특별가)
  │
  ├── vendorId ──────┐
  ├── productId      │
  ├── salesPrice     │
  └── effectiveDate  │
                     │
                     ▼
            ┌────────────────┐
            │     Vendor     │
            └────────────────┘
                     │
                     ├── inventoryMovements ─┐
                     └── salesRecords        │
                                             │
                     ┌───────────────────────┘
                     ▼
            ┌──────────────────────┐
            │ InventoryMovement    │
            ├──────────────────────┤
            │ • vendorId           │
            │ • salespersonId      │
            │ • salesRecordId ─────┼──┐
            │ • outboundType       │  │
            │ • notes              │  │
            └──────────────────────┘  │
                                      │
                     ┌────────────────┘
                     ▼
            ┌──────────────────────┐
            │   SalesRecord        │
            ├──────────────────────┤
            │ • cost (총원가)       │
            │ • margin             │
            │ • marginRate         │
            │ • costSource         │
            │ • outboundMovements  │
            └──────────────────────┘
                     │
                     ├── salespersonId
                     └── vendorId
```

## 7. UI 워크플로우

```
┌────────────────────────────────────────────────────────────────┐
│                    출고 등록 UI 워크플로우                        │
└────────────────────────────────────────────────────────────────┘

1. 사용자가 "출고 등록" 클릭
         │
         ▼
2. 출고 위치 선택 (창고/사무실)
         │
         ▼
3. 출고 목적 선택
   ├─ 판매출고 (SALES) ──┐
   │                     │
   └─ 기타출고 (OTHER)   │
                         │
         ┌───────────────┘
         │
         ▼
4. 판매출고인 경우:
   ├── 거래처 선택 (매출 거래처만)
   ├── 담당자 선택
   │
   ▼
5. 품목 선택
   │
   ▼
6. 수량 입력
   │
   ▼
7. 판매출고인 경우 미리보기 표시:
   ├── 단위원가 (currentCost)
   ├── 단위매출가 (VendorProductPrice → defaultSalesPrice)
   ├── 예상 마진
   └── 마진율
         │
         ▼
8. 비고 입력 (선택)
         │
         ▼
9. "출고 처리" 버튼 클릭
         │
         ▼
10. 출고 완료 + 판매출고인 경우 "매출 자동 생성" 메시지
```

## 8. 코드 흐름 요약

```typescript
// 1. 출고 API 호출
POST /api/outbound
{
  productId: number,
  quantity: number,
  outboundDate: string,
  outboundType: 'SALES' | 'OTHER',
  vendorId?: number,      // SALES 시 필수
  salespersonId?: number, // SALES 시 필수
  notes?: string
}

// 2. SALES 타입인 경우
if (outboundType === 'SALES') {
  // 2-1. 원가 조회
  const { cost } = await getProductCurrentCost(productId)
  const totalCost = quantity × cost
  
  // 2-2. 매출가 조회
  const unitPrice = await getVendorPrice(vendorId, productId) 
                    || product.defaultSalesPrice 
                    || 0
  
  // 2-3. SalesRecord 생성
  const salesRecord = await prisma.salesRecord.create({
    ...
    cost: totalCost,
    margin: (quantity × unitPrice) - totalCost,
    costSource: 'OUTBOUND_AUTO'
  })
  
  // 2-4. InventoryMovement에 salesRecordId 저장
  movements.forEach(m => {
    m.salesRecordId = salesRecord.id
  })
}

// 3. 반환
return {
  success: true,
  salesRecordId: salesRecord?.id
}
```
