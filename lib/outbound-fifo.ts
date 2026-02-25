export interface FifoLotInput {
  id: number
  quantityRemaining: number
  unitCost: number
  warehouseFee: number
}

export interface FifoAllocation {
  lotId: number
  quantity: number
  unitCostWithWarehouseFee: number
  totalCost: number
}

export function allocateFifoLots(lots: FifoLotInput[], requestedQuantity: number): FifoAllocation[] {
  if (requestedQuantity <= 0) {
    throw new Error('요청 수량은 0보다 커야 합니다.')
  }

  const totalAvailable = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0)
  if (totalAvailable < requestedQuantity) {
    throw new Error(`재고가 부족합니다. 현재 재고: ${totalAvailable}, 요청 수량: ${requestedQuantity}`)
  }

  let remainingQuantity = requestedQuantity
  const allocations: FifoAllocation[] = []

  for (const lot of lots) {
    if (remainingQuantity <= 0) break

    const quantity = Math.min(remainingQuantity, lot.quantityRemaining)
    const unitCostWithWarehouseFee =
      lot.quantityRemaining > 0
        ? lot.unitCost + (lot.warehouseFee || 0) / lot.quantityRemaining
        : lot.unitCost

    allocations.push({
      lotId: lot.id,
      quantity,
      unitCostWithWarehouseFee,
      totalCost: quantity * unitCostWithWarehouseFee,
    })

    remainingQuantity -= quantity
  }

  return allocations
}
