import { promises as fs } from 'fs'
import { AutomationDocumentType, PrismaClient } from '@prisma/client'
import {
  extractTextFromPdfBuffer,
  parseFixedSalesStatementFromText,
  validateParsedSalesStatement,
} from '../lib/document-parsers/sales-statement-fixed'
import { normalizeKoreanText } from '../lib/automation/text-normalize'

const prisma = new PrismaClient()
const POLL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || '5000')

async function findBestProductId(rawName: string): Promise<{ productId: number | null; score: number }> {
  const normalized = normalizeKoreanText(rawName)
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    take: 100,
    orderBy: { id: 'asc' },
  })

  let best: { id: number | null; score: number } = { id: null, score: 0 }

  for (const p of products) {
    const pNorm = normalizeKoreanText(p.name)
    let score = 0
    if (pNorm === normalized) score = 1
    else if (pNorm.includes(normalized) || normalized.includes(pNorm)) score = 0.7

    if (score > best.score) {
      best = { id: p.id, score }
    }
  }

  return { productId: best.id, score: best.score }
}

async function parseSalesStatement(documentId: string) {
  const document = await prisma.automationDocument.findUnique({ where: { id: documentId } })
  if (!document) return

  const bytes = await fs.readFile(document.storagePath)
  const text = extractTextFromPdfBuffer(bytes)
  const parsed = parseFixedSalesStatementFromText(text)
  const validation = validateParsedSalesStatement(parsed)

  console.log('[worker] parse summary', {
    documentId,
    type: document.type,
    lineCount: parsed.lines.length,
    vendorName: parsed.vendorName,
    totalAmount: parsed.totalAmount,
    valid: validation.valid,
  })

  if (!validation.valid) {
    throw new Error(validation.reason || 'Failed to validate parsed statement')
  }

  const draft = await prisma.automationDraft.create({
    data: {
      type: 'SALES_OUTBOUND',
      documentId: document.id,
      status: 'DRAFT',
      statementDate: parsed.statementDate,
      vendorName: parsed.vendorName,
      totalAmount: parsed.totalAmount,
    },
  })

  for (const line of parsed.lines) {
    const match = await findBestProductId(line.rawItemName)

    await prisma.automationDraftLine.create({
      data: {
        draftId: draft.id,
        lineNo: line.lineNo,
        rawItemName: line.rawItemName,
        normalizedItemName: line.normalizedItemName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        matchedProductId: match.productId,
        matchScore: match.score,
      },
    })
  }

  await prisma.automationDocument.update({
    where: { id: document.id },
    data: {
      parseStatus: 'PARSED',
      parsedAt: new Date(),
      extractedText: text.slice(0, 4000),
    },
  })
}

async function processByDocumentType(documentId: string, type: AutomationDocumentType) {
  if (type === 'SALES_STATEMENT') {
    await parseSalesStatement(documentId)
    return
  }

  throw new Error(`Unsupported document type for MVP parser: ${type}`)
}

async function run() {
  console.log('[worker] parser poll started', { pollMs: POLL_MS })

  while (true) {
    try {
      const pending = await prisma.automationDocument.findFirst({
        where: { parseStatus: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      })

      if (!pending) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS))
        continue
      }

      console.log('[worker] pending document found', {
        documentId: pending.id,
        type: pending.type,
        createdAt: pending.createdAt,
      })

      const lock = await prisma.automationDocument.updateMany({
        where: { id: pending.id, parseStatus: 'PENDING' },
        data: {
          parseStatus: 'PROCESSING',
          parseAttempts: { increment: 1 },
          parseError: null,
        },
      })

      if (lock.count === 0) continue

      try {
        await processByDocumentType(pending.id, pending.type)
        console.log('[worker] parse success', { documentId: pending.id, type: pending.type })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error'
        await prisma.automationDocument.update({
          where: { id: pending.id },
          data: {
            parseStatus: 'FAILED',
            parseError: message,
          },
        })
        console.error('[worker] parse failure', { documentId: pending.id, type: pending.type, error: message })
      }
    } catch (error) {
      console.error('[worker] parser poll error', error)
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
  }
}

run().catch((error) => {
  console.error('[worker] fatal', error)
  process.exit(1)
})
