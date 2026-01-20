import { prisma } from './prisma'

/**
 * Calculate storage cost rate based on current month's storage expenses
 * and warehouse inventory value
 */
export async function calculateStorageCostRate(): Promise<number> {
  // 현재 월 기준 창고료율 계산
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  // 이번 달 창고료 합계
  const storageExpenses = await prisma.storageExpense.aggregate({
    _sum: { amount: true },
    where: {
      dateFrom: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  })
  const totalStorageExpense = storageExpenses._sum.amount || 0
  
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
