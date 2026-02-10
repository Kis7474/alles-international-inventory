import { prisma } from './prisma'

/**
 * Calculate storage cost rate based on current month's storage expenses
 * and warehouse inventory value
 */
export async function calculateStorageCostRate(): Promise<number> {
  // 현재 월 기준 창고료율 계산
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // 이번 달 창고료 조회
  const warehouseFee = await prisma.warehouseFee.findUnique({
    where: { yearMonth: currentPeriod },
  })
  const totalStorageExpense = warehouseFee?.totalFee || 0
  
  // 창고 재고의 총 가치
  const warehouseInventory = await prisma.inventoryLot.findMany({
    where: {
      storageLocation: 'WAREHOUSE',
      quantityRemaining: { gt: 0 },
    },
  })
  
  const totalInventoryValue = warehouseInventory.reduce((sum, lot) => {
    return sum + (lot.quantityRemaining * lot.unitCost)
  }, 0)
  
  // 창고료율 = 창고료 / 재고 가치
  if (totalInventoryValue <= 0) return 0
  return totalStorageExpense / totalInventoryValue
}

/**
 * Get product cost with storage costs included
 * 
 * @deprecated This function uses ESTIMATED storage cost rate based on current month's warehouse fees.
 * For ACCURATE costs, use Product.currentCost field which is calculated by updateProductCurrentCost()
 * with ACTUAL allocated warehouse fees from each LOT.
 * 
 * This function will be removed in a future version. Use Product.currentCost instead.
 */
export async function getProductCostWithStorage(productId: number): Promise<{
  baseAvgCost: number
  storageCostPerUnit: number
  totalCostWithStorage: number
  storageCostRate: number
}> {
  // 창고료율 조회
  const storageCostRate = await calculateStorageCostRate()
  
  // 해당 품목의 창고 재고 LOT
  const warehouseLots = await prisma.inventoryLot.findMany({
    where: {
      productId,
      storageLocation: 'WAREHOUSE',
      quantityRemaining: { gt: 0 },
    },
  })
  
  if (warehouseLots.length === 0) {
    return {
      baseAvgCost: 0,
      storageCostPerUnit: 0,
      totalCostWithStorage: 0,
      storageCostRate,
    }
  }
  
  // 가중 평균 원가 계산
  const totalQuantity = warehouseLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0)
  const totalValue = warehouseLots.reduce((sum, lot) => sum + (lot.quantityRemaining * lot.unitCost), 0)
  const baseAvgCost = totalValue / totalQuantity
  
  // 창고료 반영
  const storageCostPerUnit = baseAvgCost * storageCostRate
  const totalCostWithStorage = baseAvgCost + storageCostPerUnit
  
  return {
    baseAvgCost,
    storageCostPerUnit,
    totalCostWithStorage,
    storageCostRate,
  }
}
