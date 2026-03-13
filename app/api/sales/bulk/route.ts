import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jsonError } from '@/lib/api-response'
import { getProductCostForSales } from '@/lib/cost-service'

interface BulkHeader {
  date: string
  type: 'SALES' | 'PURCHASE'
  salespersonId: string | number
  categoryId?: string | number
  vendorId?: string | number
  customer?: string
  notes?: string
  autoCreatePurchaseDefault?: boolean
}

interface BulkLine {
  lineNo?: number
  productId?: string | number | null
  categoryId?: string | number
  itemName?: string
  quantity: string | number
  unitPrice: string | number
  cost?: string | number
  purchasePriceOverride?: string | number
  autoCreatePurchase?: boolean
  notes?: string
}

function toNumber(value: string | number | undefined | null, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function parseLineError(message: string): { lineNo: number | null; message: string } {
  const match = message.match(/^LINE_(\d+):\s*(.+)$/)
  if (!match) return { lineNo: null, message }
  return { lineNo: Number(match[1]), message: match[2] }
}

// POST /api/sales/bulk - 다품목 매입매출 생성(원자적 처리)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const header: BulkHeader = body?.header
    const lines: BulkLine[] = body?.lines

    if (!header || !Array.isArray(lines) || lines.length === 0) {
      return jsonError('header와 lines(1건 이상)는 필수입니다.', 400)
    }

    if (!header.date || !header.type || !header.salespersonId) {
      return jsonError('header.date, type, salespersonId는 필수입니다.', 400)
    }

    const baseDate = new Date(header.date)
    if (Number.isNaN(baseDate.getTime())) {
      return jsonError('유효하지 않은 날짜입니다.', 400)
    }

    const salespersonId = Number(header.salespersonId)
    const headerCategoryId = header.categoryId ? Number(header.categoryId) : null
    const vendorId = header.vendorId ? Number(header.vendorId) : null

    if (!Number.isFinite(salespersonId)) {
      return jsonError('유효하지 않은 담당자입니다.', 400)
    }

    if (headerCategoryId !== null && !Number.isFinite(headerCategoryId)) {
      return jsonError('유효하지 않은 기본 카테고리입니다.', 400)
    }

    const autoCreatePurchaseDefault = header.autoCreatePurchaseDefault !== false

    const result = await prisma.$transaction(async (tx) => {
      const salesRecordIds: number[] = []
      let createdPurchases = 0

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        const lineNo = line.lineNo ?? index + 1

        const quantity = toNumber(line.quantity)
        const unitPrice = toNumber(line.unitPrice)

        if (quantity <= 0) {
          throw new Error(`LINE_${lineNo}: 수량은 0보다 커야 합니다.`)
        }
        if (unitPrice <= 0) {
          throw new Error(`LINE_${lineNo}: 단가는 0보다 커야 합니다.`)
        }

        const productId = line.productId ? Number(line.productId) : null
        if (productId !== null && !Number.isFinite(productId)) {
          throw new Error(`LINE_${lineNo}: 유효하지 않은 품목입니다.`)
        }

        const product = productId
          ? await tx.product.findUnique({ where: { id: productId }, include: { purchaseVendor: true } })
          : null

        if (productId && !product) {
          throw new Error(`LINE_${lineNo}: 품목을 찾을 수 없습니다.`)
        }

        const resolvedCategoryIdRaw = line.categoryId ?? headerCategoryId
        const resolvedCategoryId = resolvedCategoryIdRaw !== null && resolvedCategoryIdRaw !== undefined && resolvedCategoryIdRaw !== ''
          ? Number(resolvedCategoryIdRaw)
          : NaN

        if (!Number.isFinite(resolvedCategoryId)) {
          throw new Error(`LINE_${lineNo}: 카테고리는 필수입니다.`)
        }

        const itemName = line.itemName?.trim() || product?.name || ''
        if (!itemName) {
          throw new Error(`LINE_${lineNo}: 품목명은 필수입니다.`)
        }

        const amount = quantity * unitPrice

        let finalCost = 0
        let costSource: string | null = null

        if (header.type === 'SALES') {
          if (line.cost !== undefined && line.cost !== null && line.cost !== '') {
            finalCost = toNumber(line.cost)
            costSource = 'MANUAL'
          } else if (productId) {
            const costData = await getProductCostForSales(productId)
            finalCost = costData.cost
            costSource = costData.source === 'DEFAULT' ? 'PRODUCT_DEFAULT' : 'PRODUCT_CURRENT'
          } else {
            finalCost = 0
            costSource = 'MANUAL'
          }
        }

        const totalCost = finalCost * quantity
        const margin = header.type === 'SALES' ? amount - totalCost : 0
        const marginRate = header.type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

        const salesRecord = await tx.salesRecord.create({
          data: {
            date: baseDate,
            type: header.type,
            salespersonId,
            categoryId: resolvedCategoryId,
            productId,
            vendorId,
            itemName,
            customer: header.customer || null,
            quantity,
            unitPrice,
            amount,
            cost: finalCost,
            margin,
            marginRate,
            costSource,
            notes: line.notes || header.notes || null,
          },
        })

        salesRecordIds.push(salesRecord.id)

        const autoCreatePurchase = line.autoCreatePurchase ?? autoCreatePurchaseDefault

        if (header.type === 'SALES' && autoCreatePurchase && productId) {
          if (!product?.purchaseVendorId) {
            throw new Error(`LINE_${lineNo}: 품목의 매입 거래처가 없어 자동 매입을 생성할 수 없습니다.`)
          }

          const purchasePrice = toNumber(line.purchasePriceOverride, product.defaultPurchasePrice || 0)

          if (purchasePrice > 0) {
            await tx.salesRecord.create({
              data: {
                date: baseDate,
                type: 'PURCHASE',
                salespersonId,
                categoryId: resolvedCategoryId,
                productId,
                vendorId: product.purchaseVendorId,
                itemName: product.name,
                customer: null,
                quantity,
                unitPrice: purchasePrice,
                amount: quantity * purchasePrice,
                cost: 0,
                margin: 0,
                marginRate: 0,
                costSource: 'SALES_AUTO',
                linkedSalesId: salesRecord.id,
                notes: '자동생성',
              },
            })
            createdPurchases += 1
          }
        }
      }

      return {
        summary: {
          totalLines: lines.length,
          createdSales: salesRecordIds.length,
          createdPurchases,
        },
        salesRecordIds,
      }
    })

    return NextResponse.json({ success: true, mode: 'atomic', ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : '다품목 등록 중 오류가 발생했습니다.'
    const lineError = parseLineError(message)

    return NextResponse.json(
      {
        success: false,
        mode: 'atomic',
        error: lineError.lineNo ? 'VALIDATION_FAILED' : message,
        lineErrors: lineError.lineNo ? [{ lineNo: lineError.lineNo, message: lineError.message }] : [],
      },
      { status: 400 },
    )
  }
}
