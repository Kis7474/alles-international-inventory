import { inflateSync } from 'zlib'
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

function decodePdfLiteralString(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i += 1) {
    const c = input[i]
    if (c !== '\\') {
      out += c
      continue
    }

    const next = input[i + 1]
    if (!next) break

    if (/[0-7]/.test(next)) {
      const oct = input.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] || next
      out += String.fromCharCode(parseInt(oct, 8))
      i += oct.length
      continue
    }

    const map: Record<string, string> = {
      n: '\n',
      r: '\r',
      t: '\t',
      b: '\b',
      f: '\f',
      '(': '(',
      ')': ')',
      '\\': '\\',
    }

    out += map[next] ?? next
    i += 1
  }

  return out
}

function decodePdfHexString(hex: string): string {
  const cleaned = hex.replace(/\s+/g, '')
  if (!cleaned) return ''
  const even = cleaned.length % 2 === 0 ? cleaned : `${cleaned}0`
  const bytes = Buffer.from(even, 'hex')

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const body = bytes.subarray(2)
    const swapped = Buffer.alloc(body.length)
    for (let i = 0; i + 1 < body.length; i += 2) {
      swapped[i] = body[i + 1]
      swapped[i + 1] = body[i]
    }
    return swapped.toString('utf16le')
  }

  return bytes.toString('latin1')
}

function extractTextOps(content: string): string[] {
  const chunks: string[] = []

  const literalOps = Array.from(content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|"|TJ)/g))
  for (const m of literalOps) {
    const decoded = decodePdfLiteralString(m[1])
    if (decoded.trim()) chunks.push(decoded)
  }

  const arrayOps = Array.from(content.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g))
  for (const m of arrayOps) {
    const arr = m[1]
    for (const s of Array.from(arr.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g))) {
      const value = s[1] ? decodePdfLiteralString(s[1]) : decodePdfHexString(s[2])
      if (value.trim()) chunks.push(value)
    }
  }

  return chunks
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\x00/g, '')
    .replace(/[\t\f]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

function isArtifactLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (/\/Resources|\/Font|\/ProcSet|\/MediaBox|endobj|obj|xref|stream|endstream/i.test(trimmed)) return true
  if ((trimmed.match(/[<>{}\[\]\/]/g) || []).length > trimmed.length / 6) return true
  return false
}

function parseLineItem(line: string): Omit<ParsedSalesLine, 'lineNo' | 'normalizedItemName'> | null {
  const work = line.trim().replace(/^\d{1,3}\s*[.|)]\s*/, '')
  if (!work || isArtifactLine(work)) return null

  const numberMatches = Array.from(work.matchAll(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g))
  if (numberMatches.length < 2) return null

  const tail = numberMatches.slice(-3)
  const nums = tail.map((m) => parseNumber(m[0]))
  if (nums.some((n) => Number.isNaN(n))) return null

  let quantity = nums.length === 3 ? nums[0] : 0
  const unitPrice = nums.length === 3 ? nums[1] : nums[0]
  const amount = nums.length === 3 ? nums[2] : nums[1]

  if ((quantity <= 0 || quantity > 100000) && unitPrice > 0) {
    const inferred = amount / unitPrice
    if (Number.isFinite(inferred) && inferred > 0 && inferred < 100000) {
      quantity = Number(inferred.toFixed(3))
    }
  }

  const cutIndex = tail[0]?.index ?? 0
  const rawItemName = work.slice(0, cutIndex).replace(/[|]+/g, ' ').trim()
  if (!rawItemName || rawItemName.length < 2) return null
  if (/^[\d\W_]+$/.test(rawItemName)) return null
  if (amount <= 0 || unitPrice < 0 || quantity <= 0) return null

  return { rawItemName, quantity, unitPrice, amount }
}

export function parseFixedSalesStatementFromText(text: string): ParsedSalesStatement {
  const cleanedText = normalizeExtractedText(text)
  const vendorMatch = cleanedText.match(/(?:받는분|거래처)\s*[:：]?\s*([^\n\r]+)/)
  const dateMatch = cleanedText.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  const totalMatch = cleanedText.match(/(?:총금액|합계)\s*[:：]?\s*([\d,]+)/)

  const lines: ParsedSalesLine[] = []
  const seen = new Set<string>()

  for (const line of cleanedText.split('\n')) {
    const parsed = parseLineItem(line)
    if (!parsed) continue

    const dedupeKey = `${parsed.rawItemName}|${parsed.quantity}|${parsed.unitPrice}|${parsed.amount}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    lines.push({
      lineNo: lines.length + 1,
      rawItemName: parsed.rawItemName,
      normalizedItemName: normalizeKoreanText(parsed.rawItemName),
      quantity: parsed.quantity,
      unitPrice: parsed.unitPrice,
      amount: parsed.amount,
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

export function validateParsedSalesStatement(statement: ParsedSalesStatement): { valid: boolean; reason?: string } {
  if (statement.lines.length === 0) {
    return { valid: false, reason: 'No valid sales line items detected from PDF text' }
  }

  const meaningfulLines = statement.lines.filter((line) => line.rawItemName.length >= 2 && line.amount > 0)
  if (meaningfulLines.length === 0) {
    return { valid: false, reason: 'Parsed lines were present but all appeared invalid/artifact-like' }
  }

  const suspicious = statement.lines.filter((line) => /\/Resources|\/Font|xref|obj|MediaBox/i.test(line.rawItemName))
  if (suspicious.length > 0) {
    return { valid: false, reason: 'Parser output still contains PDF structure artifacts' }
  }

  return { valid: true }
}

export function extractTextFromPdfBuffer(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  const textChunks: string[] = []

  for (const m of Array.from(raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g))) {
    const streamBody = m[1]
    const bytes = Buffer.from(streamBody, 'latin1')

    try {
      const inflated = inflateSync(bytes)
      textChunks.push(...extractTextOps(inflated.toString('latin1')))
    } catch {
      textChunks.push(...extractTextOps(streamBody))
    }
  }

  const combined = textChunks.join('\n')
  if (combined.trim()) return normalizeExtractedText(combined)
  return normalizeExtractedText(raw)
}
