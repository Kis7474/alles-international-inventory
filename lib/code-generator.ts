/**
 * 자동 코드 생성 유틸리티
 * 형식: PREFIX-YYYYMM-NNNN (순번 4자리)
 * 예: PRD-202602-0001, LOT-202602-0001, SVC-202602-0001
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateProductCode(prisma: any): Promise<string> {
  const prefix = 'PRD'
  const dateStr = getDateString()
  const lastProduct = await prisma.product.findFirst({
    where: { code: { startsWith: `${prefix}-${dateStr}` } },
    orderBy: { code: 'desc' },
  })
  const seq = extractSequence(lastProduct?.code) + 1
  return `${prefix}-${dateStr}-${seq.toString().padStart(4, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateLotCode(prisma: any): Promise<string> {
  const prefix = 'LOT'
  const dateStr = getDateString()
  const lastLot = await prisma.inventoryLot.findFirst({
    where: { lotCode: { startsWith: `${prefix}-${dateStr}` } },
    orderBy: { lotCode: 'desc' },
  })
  const seq = extractSequence(lastLot?.lotCode) + 1
  return `${prefix}-${dateStr}-${seq.toString().padStart(4, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateServiceCode(prisma: any): Promise<string> {
  const prefix = 'SVC'
  const dateStr = getDateString()
  const lastService = await prisma.service.findFirst({
    where: { code: { startsWith: `${prefix}-${dateStr}` } },
    orderBy: { code: 'desc' },
  })
  const seq = extractSequence(lastService?.code) + 1
  return `${prefix}-${dateStr}-${seq.toString().padStart(4, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateVendorCode(prisma: any, type: string): Promise<string> {
  // PURCHASE → VND, SALES → CST, BOTH → VND
  const prefix = type === 'SALES' ? 'CST' : 'VND'
  const dateStr = getDateString()
  const lastVendor = await prisma.vendor.findFirst({
    where: { code: { startsWith: `${prefix}-${dateStr}` } },
    orderBy: { code: 'desc' },
  })
  const seq = extractSequence(lastVendor?.code) + 1
  return `${prefix}-${dateStr}-${seq.toString().padStart(4, '0')}`
}

function getDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}${month}`
}

function extractSequence(code: string | null | undefined): number {
  if (!code) return 0
  const parts = code.split('-')
  const lastPart = parts[parts.length - 1]
  const num = parseInt(lastPart, 10)
  return isNaN(num) ? 0 : num
}
