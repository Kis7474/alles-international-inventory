/**
 * VAT rate (10% for Korean tax system)
 */
export const VAT_RATE = 0.1

/**
 * Calculate VAT and totals
 */
export function calculateVAT(subtotal: number): {
  vatAmount: number
  totalAmount: number
} {
  const vatAmount = Math.round(subtotal * VAT_RATE)
  const totalAmount = subtotal + vatAmount
  return { vatAmount, totalAmount }
}

/**
 * Generate document number with date-based sequence
 * @param prefix Document prefix (e.g., 'AQ' for quotation, 'TS' for transaction statement)
 * @param lastDocNumber Last document number with the same prefix
 * @returns Generated document number (e.g., 'AQ260126-01')
 */
export function generateDocumentNumber(
  prefix: string,
  lastDocNumber: string | null
): string {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
    .slice(0, 6) // YYMMDD
  const currentPrefix = `${prefix}${dateStr}`

  let sequence = 1
  if (lastDocNumber && lastDocNumber.startsWith(currentPrefix)) {
    const lastSeq = parseInt(lastDocNumber.slice(-2))
    sequence = lastSeq + 1
  }

  return `${currentPrefix}-${sequence.toString().padStart(2, '0')}`
}

/**
 * Company information constants
 */
export const COMPANY_INFO = {
  name: '알레스인터네셔날(주)',
  nameEn: 'ALLES International Ltd.',
  address: '김포시 태장로 741 경동미르웰시티 632호',
  phone: '(02) 2645-8886',
  fax: '(031) 983-8867',
  website: 'http://www.alleskr.com/',
  bankName: '하나은행',
  bankAccount: '586-910007-02104',
  bankAccountHolder: '알레스인터네셔날 주식회사',
  businessNumber: '109-86-37337',
  ceo: '박범석',
}
