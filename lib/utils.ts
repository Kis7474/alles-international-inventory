/**
 * 숫자를 천 단위 콤마로 포맷팅
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 통화별 금액 포맷팅
 */
export function formatCurrency(amount: number, currency: string = 'KRW'): string {
  const symbols: Record<string, string> = {
    KRW: '₩',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    CNY: '¥',
  }
  
  const symbol = symbols[currency] || currency
  
  if (currency === 'KRW' || currency === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString('ko-KR')}`
  }
  return `${symbol}${amount.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * 부가세 계산 (한국 VAT 10%)
 */
export function calculateVat(amount: number, vatIncluded: boolean): {
  supplyAmount: number
  vatAmount: number
  totalAmount: number
} {
  if (vatIncluded) {
    // 부가세 포함 금액에서 역산
    const supplyAmount = Math.round(amount / 1.1)
    const vatAmount = amount - supplyAmount
    return { supplyAmount, vatAmount, totalAmount: amount }
  } else {
    // 부가세 별도
    const vatAmount = Math.round(amount * 0.1)
    return { supplyAmount: amount, vatAmount, totalAmount: amount + vatAmount }
  }
}

/**
 * 수입 원가 계산
 */
export function calculateImportCost(data: {
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
} {
  const krwGoodsAmount = data.goodsAmount * data.exchangeRate
  const totalCost = krwGoodsAmount + data.dutyAmount + data.shippingCost + data.otherCost
  const unitCost = data.quantity > 0 ? totalCost / data.quantity : 0
  
  return { totalCost, unitCost, krwGoodsAmount }
}

/**
 * 다중 품목에 대한 비용 분배
 */
export function distributeCostsAcrossItems({
  goodsAmount,
  dutyAmount,
  shippingCost,
  otherCost,
  exchangeRate,
  itemCount,
}: {
  goodsAmount: number | null
  dutyAmount: number | null
  shippingCost: number | null
  otherCost: number | null
  exchangeRate: number
  itemCount: number
}) {
  const count = itemCount || 1
  return {
    goodsAmountPerItem: goodsAmount ? (goodsAmount * exchangeRate) / count : 0,
    dutyAmountPerItem: dutyAmount ? dutyAmount / count : 0,
    shippingCostPerItem: shippingCost ? shippingCost / count : 0,
    otherCostPerItem: otherCost ? otherCost / count : 0,
  }
}

/**
 * 원가 계산 (소수점 6자리)
 */
export function calculateUnitCost(
  goodsAmount: number,
  dutyAmount: number,
  domesticFreight: number,
  otherCost: number,
  quantity: number
): number {
  if (quantity <= 0) return 0
  const result = (goodsAmount + dutyAmount + domesticFreight + otherCost) / quantity
  // 소수점 6자리까지 정밀도 유지
  return Math.round(result * 1000000) / 1000000
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * 날짜를 YYYY-MM 형식으로 포맷팅 (월별 표시용)
 */
export function formatMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Calculate warehouse fee rate for a given period
 * @param monthlyFee Monthly warehouse fee
 * @param avgInventoryValue Average monthly warehouse inventory value
 * @returns Warehouse fee rate as decimal (e.g., 0.05 for 5%)
 */
export function calculateWarehouseFeeRate(monthlyFee: number, avgInventoryValue: number): number {
  if (avgInventoryValue === 0) return 0
  return monthlyFee / avgInventoryValue
}

/**
 * Calculate adjusted cost with warehouse fee
 * @param baseCost Base unit cost
 * @param feeRate Warehouse fee rate (decimal)
 * @param storageMonths Number of months in storage
 * @returns Adjusted cost including warehouse fee
 */
export function calculateAdjustedCost(baseCost: number, feeRate: number, storageMonths: number): number {
  return baseCost + (baseCost * feeRate * storageMonths)
}

/**
 * Calculate storage months between two dates
 * @param startDate Start date
 * @param endDate End date (defaults to now)
 * @returns Number of months (rounded to 1 decimal)
 */
export function calculateStorageMonths(startDate: Date, endDate: Date = new Date()): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  // Using 30.44 as average days per month (365.25 / 12)
  const months = diffDays / 30.44
  return Math.round(months * 10) / 10
}
