import { normalizeKoreanText } from '../automation/text-normalize'

export interface ParsedSalesLine {
  lineNo: number
  rawItemName: string
  normalizedItemName: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface ParsedSalesStatement {
  vendorName: string | null
  statementDate: Date | null
  totalAmount: number | null
  lines: ParsedSalesLine[]
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, '').trim())
}

export function parseFixedSalesStatementFromText(text: string): ParsedSalesStatement {
  const vendorMatch = text.match(/(?:받는분|거래처)\s*[:：]?\s*([^\n\r]+)/)
  const dateMatch = text.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  const totalMatch = text.match(/(?:총금액|합계)\s*[:：]?\s*([\d,]+)/)

  const lines: ParsedSalesLine[] = []
  const pattern = /(\d{1,2})\s*[.|)]?\s*([^\n\r\t]+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+)\s+([\d,]+)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const rawItemName = match[2].trim()
    const quantity = parseNumber(match[3])
    const unitPrice = parseNumber(match[4])
    const amount = parseNumber(match[5])

    if (!rawItemName || Number.isNaN(quantity) || Number.isNaN(unitPrice) || Number.isNaN(amount)) {
      continue
    }

    lines.push({
      lineNo: lines.length + 1,
      rawItemName,
      normalizedItemName: normalizeKoreanText(rawItemName),
      quantity,
      unitPrice,
      amount,
    })
  }

  const statementDate = dateMatch
    ? new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]))
    : null

  return {
    vendorName: vendorMatch?.[1]?.trim() || null,
    statementDate,
    totalAmount: totalMatch ? parseNumber(totalMatch[1]) : null,
    lines,
  }
}

export function extractTextFromPdfBuffer(buffer: Buffer): string {
  return buffer.toString('latin1').replace(/\x00/g, '')
}
