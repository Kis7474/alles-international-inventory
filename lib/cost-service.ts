import {
  getProductCurrentCost,
  updateProductCurrentCost,
} from '@/lib/product-cost'
import {
  calculateStorageCostRate,
  getProductCostWithStorage,
} from '@/lib/storage-cost'

// NOTE: Cost facade layer.
// Keep algorithm behavior unchanged and only delegate to existing cost modules.

export type ProductCostSource = 'CURRENT' | 'DEFAULT' | 'NONE'

export interface ProductCostResult {
  cost: number
  source: ProductCostSource
}

/**
 * 현재 사용되는 품목 원가 진입점
 * - delegates to: getProductCurrentCost() in lib/product-cost.ts
 */
export async function getProductCostForSales(productId: number): Promise<ProductCostResult> {
  return getProductCurrentCost(productId)
}

/**
 * 품목 currentCost 재계산 진입점
 * - delegates to: updateProductCurrentCost() in lib/product-cost.ts
 */
export async function refreshProductCurrentCost(productId: number): Promise<number> {
  return updateProductCurrentCost(productId)
}

/**
 * (Deprecated path 유지) 추정 창고료 포함 원가 진입점
 * - delegates to: getProductCostWithStorage() in lib/storage-cost.ts
 */
export async function getEstimatedProductCostWithStorage(productId: number) {
  return getProductCostWithStorage(productId)
}

/**
 * (Deprecated path 유지) 당월 창고료율 조회 진입점
 * - delegates to: calculateStorageCostRate() in lib/storage-cost.ts
 */
export async function getCurrentStorageCostRate() {
  return calculateStorageCostRate()
}
