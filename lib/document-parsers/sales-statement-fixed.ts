import { execFile } from 'child_process'
import { promisify } from 'util'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { inflateSync } from 'zlib'
import { normalizeKoreanText } from '../automation/text-normalize'

const execFileAsync = promisify(execFile)

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

export interface SalesStatementParseDebug {
  extractedTextPreview: string
  candidateRows: string[]
}

function parseNumber(raw: string): number {
  return Number(raw.replace(/[₩,\s]/g, '').trim())
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

  for (const m of Array.from(content.matchAll(/\[((?:.|\n|\r)*?)\]\s*TJ/g))) {
    const arr = m[1]
    const joined = Array.from(arr.matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g))
      .map((s) => (s[1] ? decodePdfLiteralString(s[1]) : decodePdfHexString(s[2])))
      .join('')
      .trim()

    if (joined) chunks.push(joined)
  }

  for (const m of Array.from(content.matchAll(/\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")/g))) {
    const decoded = decodePdfLiteralString(m[1]).trim()
    if (decoded) chunks.push(decoded)
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
    .replace(/\n{3,}/g, '\n\n')
}

function isArtifactLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (/\/Resources|\/Font|\/ProcSet|\/MediaBox|endobj|obj|xref|stream|endstream|Filter|Length/i.test(trimmed)) return true
  if ((trimmed.match(/[<>{}\[\]\/]/g) || []).length > trimmed.length / 5) return true
  return false
}

function toColumns(line: string): string[] {
  return line
    .replace(/[|│]/g, ' ')
    .split(/\s{2,}/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function parseLineItem(line: string): Omit<ParsedSalesLine, 'lineNo' | 'normalizedItemName'> | null {
  const work = line
    .trim()
    .replace(/^\d{1,3}\s*[.|)]\s*/, '')
    .replace(/[₩]/g, '')
  if (!work || isArtifactLine(work)) return null

  const numberMatches = Array.from(work.matchAll(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g))
  if (numberMatches.length < 3) return null

  const tail = numberMatches.slice(-3)
  const nums = tail.map((m) => parseNumber(m[0]))
  if (nums.some((n) => Number.isNaN(n))) return null

  let quantity = nums[0]
  const unitPrice = nums[1]
  const amount = nums[2]

  if ((quantity <= 0 || quantity > 100000) && unitPrice > 0 && amount > 0) {
    const inferred = amount / unitPrice
    if (Number.isFinite(inferred) && inferred > 0 && inferred < 100000) {
      quantity = Number(inferred.toFixed(3))
    }
  }

  const cutIndex = tail[0]?.index ?? 0
  const columns = toColumns(work.slice(0, cutIndex))
  const rawItemName = (columns.length >= 2 ? columns[columns.length - 2] : columns[0] || '')
    .replace(/^(?:\d{1,3}|\d{1,2}\/\d{1,2})\s+/, '')
    .replace(/^(?:No|번호|날짜)$/i, '')
    .trim()

  if (!rawItemName || rawItemName.length < 2) return null
  if (/^[\d\W_]+$/.test(rawItemName)) return null
  if (amount <= 0 || unitPrice <= 0 || quantity <= 0) return null

  return { rawItemName, quantity, unitPrice, amount }
}

function buildErpTemplateRows(lines: string[]): string[] {
  const headerIndex = lines.findIndex((line) => /\bNo\b/i.test(line) && /제품명/.test(line) && /수량/.test(line) && /단가/.test(line) && /금액/.test(line))
  if (headerIndex < 0) return []

  const out: string[] = []
  for (const line of lines.slice(headerIndex + 1)) {
    if (/(?:금액|부가세|총금액|계좌번호|지불조건)\s*[:：]?/.test(line)) break
    if (line.length < 4) continue
    out.push(line)
  }
  return out
}

function buildCandidateRows(cleanedText: string): string[] {
  const lines = cleanedText.split('\n').map((line) => line.trim()).filter((line) => line.length >= 2)
  const erpRows = buildErpTemplateRows(lines)
  const genericRows = lines
    .filter((line) => line.length >= 4)
    .filter((line) => /\d{1,3}(?:,\d{3})/.test(line) || /\b\d+\s+\d[\d,]+\s+\d[\d,]+$/.test(line))

  return Array.from(new Set([...erpRows, ...genericRows])).slice(0, 60)
}

export function getSalesStatementParseDebug(text: string): SalesStatementParseDebug {
  const cleanedText = normalizeExtractedText(text)
  return {
    extractedTextPreview: cleanedText.slice(0, 2000),
    candidateRows: buildCandidateRows(cleanedText).slice(0, 20),
  }
}

export function parseFixedSalesStatementFromText(text: string): ParsedSalesStatement {
  const cleanedText = normalizeExtractedText(text)
  const vendorMatch = cleanedText.match(/(?:받는분|거래처)\s*[:：]?\s*([^\n\r]+)/)
  const dateMatch = cleanedText.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/)
  const totalMatch = cleanedText.match(/(?:총금액|합계)\s*[:：]?\s*₩?\s*([\d,]+)/)

  const lines: ParsedSalesLine[] = []
  const seen = new Set<string>()

  for (const line of buildCandidateRows(cleanedText)) {
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

async function extractTextWithPdftotext(buffer: Buffer): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), 'sales-pdf-'))
  const inputPath = join(workDir, 'input.pdf')
  const outputPath = join(workDir, 'output.txt')

  try {
    await writeFile(inputPath, buffer)
    await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', inputPath, outputPath])
    const txt = await readFile(outputPath, 'utf8')
    return normalizeExtractedText(txt)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}

function extractTextFromPdfBufferLegacy(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  const textChunks: string[] = []

  for (const m of Array.from(raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g))) {
    const streamBody = m[1]
    const bytes = Buffer.from(streamBody, 'latin1')

    try {
      const inflated = inflateSync(bytes).toString('latin1')
      textChunks.push(...extractTextOps(inflated))
    } catch {
      textChunks.push(...extractTextOps(streamBody))
    }
  }

  const combined = textChunks.join('\n')
  if (combined.trim()) return normalizeExtractedText(combined)
  return normalizeExtractedText(raw)
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const extracted = await extractTextWithPdftotext(buffer)
    if (extracted.trim()) {
      return extracted
    }
  } catch {
    // fallback below
  }

  return extractTextFromPdfBufferLegacy(buffer)
}
