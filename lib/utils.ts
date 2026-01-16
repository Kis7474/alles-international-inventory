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
  return (goodsAmount + dutyAmount + domesticFreight + otherCost) / quantity
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
