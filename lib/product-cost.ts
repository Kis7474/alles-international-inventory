import { prisma } from '@/lib/prisma'

/**
 * 수입등록 시 품목 기본 원가 업데이트
 * - defaultPurchasePrice 업데이트
 * - ProductPriceHistory에 이력 추가
 */
export async function updateProductPurchasePrice(
  productId: number,
  unitCost: number,
  effectiveDate: Date
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update product's defaultPurchasePrice
    await tx.product.update({
      where: { id: productId },
      data: {
        defaultPurchasePrice: unitCost,
      },
    })

    // Add to price history
    await tx.productPriceHistory.create({
      data: {
        productId,
        effectiveDate,
        purchasePrice: unitCost,
        notes: '수입등록 시 자동 업데이트',
      },
    })
  })
}

/**
 * 창고(WAREHOUSE) LOT 기준 currentCost 계산 및 업데이트
 * - WAREHOUSE LOT만 대상 (OFFICE 제외)
 * - 가중평균: Σ(잔량 × 단가 + 창고료) / 총잔량
 * - ProductMonthlyCost에 월별 이력 기록
 */
export async function updateProductCurrentCost(productId: number): Promise<number> {
  // Get all WAREHOUSE lots with remaining quantity > 0
  const warehouseLots = await prisma.inventoryLot.findMany({
    where: {
      productId,
      storageLocation: 'WAREHOUSE',
      quantityRemaining: {
        gt: 0,
      },
    },
  })

  if (warehouseLots.length === 0) {
    // No warehouse lots, currentCost remains null or unchanged
    return 0
  }

  // Calculate weighted average: Σ(remaining × unitCost + warehouseFee) / Σ(remaining)
  // Note: warehouseFee is the TOTAL accumulated fee for the entire lot, not per-unit
  let totalCost = 0
  let totalQuantity = 0

  for (const lot of warehouseLots) {
    const lotTotalCost = lot.quantityRemaining * lot.unitCost + lot.warehouseFee
    totalCost += lotTotalCost
    totalQuantity += lot.quantityRemaining
  }

  const currentCost = totalQuantity > 0 ? totalCost / totalQuantity : 0

  // Update product's currentCost
  await prisma.product.update({
    where: { id: productId },
    data: {
      currentCost,
      lastCostUpdatedAt: new Date(),
    },
  })

  // Record monthly cost history
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Calculate base cost (average unit cost without warehouse fee)
  const totalBaseCost = warehouseLots.reduce(
    (sum, lot) => sum + lot.quantityRemaining * lot.unitCost,
    0
  )
  const baseCost = totalQuantity > 0 ? totalBaseCost / totalQuantity : 0

  // Total warehouse fee
  const totalWarehouseFee = warehouseLots.reduce((sum, lot) => sum + lot.warehouseFee, 0)
  const storageCost = totalQuantity > 0 ? totalWarehouseFee / totalQuantity : 0

  // Upsert monthly cost record
  await prisma.productMonthlyCost.upsert({
    where: {
      productId_yearMonth: {
        productId,
        yearMonth,
      },
    },
    update: {
      baseCost,
      storageCost,
      totalCost: currentCost,
      quantity: totalQuantity,
      updatedAt: new Date(),
    },
    create: {
      productId,
      yearMonth,
      baseCost,
      storageCost,
      totalCost: currentCost,
      quantity: totalQuantity,
    },
  })

  return currentCost
}

/**
 * 품목의 현재 원가 조회 (매출 등록 시 사용)
 */
export async function getProductCurrentCost(productId: number): Promise<{
  cost: number
  source: 'CURRENT' | 'DEFAULT' | 'NONE'
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      currentCost: true,
      defaultPurchasePrice: true,
    },
  })

  if (!product) {
    return { cost: 0, source: 'NONE' }
  }

  // Prefer currentCost if available
  if (product.currentCost !== null && product.currentCost > 0) {
    return { cost: product.currentCost, source: 'CURRENT' }
  }

  // Fallback to defaultPurchasePrice
  if (product.defaultPurchasePrice !== null && product.defaultPurchasePrice > 0) {
    return { cost: product.defaultPurchasePrice, source: 'DEFAULT' }
  }

  return { cost: 0, source: 'NONE' }
}
