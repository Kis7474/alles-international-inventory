import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateVAT, generateDocumentNumber } from '@/lib/document-utils'

function getDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function resolveDateRange(startDate?: string | null, endDate?: string | null, month?: string | null) {
  if (month) {
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const monthIndex = parseInt(monthStr, 10) - 1

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return null
    }

    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999))
    return { startDate: start, endDate: end, normalizedMonth: `${year}-${String(monthIndex + 1).padStart(2, '0')}` }
  }

  if (!startDate || !endDate) {
    return null
  }

  return {
    startDate: new Date(startDate),
    endDate: new Date(`${endDate}T23:59:59.999Z`),
    normalizedMonth: null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month')
    const categoryIdsParam = searchParams.get('categoryIds')
    const searchText = searchParams.get('searchText')
    const type = searchParams.get('type') // SALES | PURCHASE | ALL

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId는 필수입니다.' }, { status: 400 })
    }

    const dateRange = resolveDateRange(startDate, endDate, month)
    if (!dateRange) {
      return NextResponse.json({ error: 'month 또는 startDate/endDate를 올바르게 입력해주세요.' }, { status: 400 })
    }

    const where: {
      vendorId: number
      date: { gte: Date; lte: Date }
      categoryId?: { in: number[] }
      type?: 'SALES' | 'PURCHASE'
      itemName?: { contains: string; mode: 'insensitive' }
    } = {
      vendorId: parseInt(vendorId, 10),
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    }

    const categoryIds = categoryIdsParam
      ? categoryIdsParam
          .split(',')
          .map((id) => parseInt(id, 10))
          .filter((id) => !Number.isNaN(id))
      : []

    if (categoryIds.length > 0) where.categoryId = { in: categoryIds }
    if (type === 'SALES' || type === 'PURCHASE') where.type = type
    if (searchText) where.itemName = { contains: searchText, mode: 'insensitive' }

    const records = await prisma.salesRecord.findMany({
      where,
      include: {
        product: {
          select: { unit: true },
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })

    const rows = records.map((record) => ({
      id: record.id,
      type: record.type,
      date: getDateOnly(record.date),
      productName: record.itemName,
      specification: record.product?.unit || null,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      amount: record.amount,
    }))

    const salesSubtotal = records.filter((r) => r.type === 'SALES').reduce((sum, r) => sum + r.amount, 0)
    const purchaseSubtotal = records.filter((r) => r.type === 'PURCHASE').reduce((sum, r) => sum + r.amount, 0)

    return NextResponse.json({
      rows,
      summary: {
        salesSubtotal,
        purchaseSubtotal,
        grandTotal: salesSubtotal + purchaseSubtotal,
      },
      period: {
        startDate: getDateOnly(dateRange.startDate),
        endDate: getDateOnly(dateRange.endDate),
        month: dateRange.normalizedMonth,
      },
    })
  } catch (error) {
    console.error('Error fetching monthly vendor statement data:', error)
    return NextResponse.json({ error: '월합명세서 데이터 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendorId,
      recipientName,
      recipientRef,
      paymentTerms,
      startDate,
      endDate,
      month,
      categoryIds,
      searchText,
      type,
    } = body as {
      vendorId: number
      recipientName?: string
      recipientRef?: string
      paymentTerms?: string
      startDate?: string
      endDate?: string
      month?: string
      categoryIds?: number[]
      searchText?: string
      type: 'SALES' | 'PURCHASE'
    }

    if (!vendorId || !type) {
      return NextResponse.json({ error: 'vendorId, type은 필수입니다.' }, { status: 400 })
    }

    const dateRange = resolveDateRange(startDate, endDate, month)
    if (!dateRange) {
      return NextResponse.json({ error: 'month 또는 startDate/endDate를 올바르게 입력해주세요.' }, { status: 400 })
    }

    const where: {
      vendorId: number
      type: 'SALES' | 'PURCHASE'
      date: { gte: Date; lte: Date }
      categoryId?: { in: number[] }
      itemName?: { contains: string; mode: 'insensitive' }
    } = {
      vendorId: parseInt(String(vendorId), 10),
      type,
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    }

    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const parsedCategoryIds = categoryIds
        .map((id) => parseInt(String(id), 10))
        .filter((id) => !Number.isNaN(id))

      if (parsedCategoryIds.length > 0) where.categoryId = { in: parsedCategoryIds }
    }

    if (searchText) where.itemName = { contains: searchText, mode: 'insensitive' }

    const records = await prisma.salesRecord.findMany({
      where,
      include: {
        product: {
          select: { unit: true },
        },
        vendor: {
          select: { name: true },
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    })

    if (records.length === 0) {
      return NextResponse.json({ error: '선택한 조건에 해당하는 데이터가 없습니다.' }, { status: 400 })
    }

    const lastStatement = await prisma.transactionStatement.findFirst({
      orderBy: { statementNumber: 'desc' },
    })
    const statementNumber = generateDocumentNumber('TS', lastStatement?.statementNumber || null)

    const items = records.map((record, index) => ({
      itemNo: index + 1,
      productName: record.itemName,
      specification: `${getDateOnly(record.date)}${record.product?.unit ? ` / ${record.product.unit}` : ''}`,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      amount: record.amount,
    }))

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const { vatAmount, totalAmount } = calculateVAT(subtotal)

    const normalizedStartDate = getDateOnly(dateRange.startDate)
    const normalizedEndDate = getDateOnly(dateRange.endDate)

    const statement = await prisma.transactionStatement.create({
      data: {
        statementNumber,
        deliveryDate: dateRange.endDate,
        recipientName: recipientName || records[0]?.vendor?.name || null,
        recipientRef: recipientRef || `${type} 월합명세서 (${normalizedStartDate}~${normalizedEndDate})`,
        subtotal,
        vatAmount,
        totalAmount,
        paymentTerms: paymentTerms || '월합 정산',
        bankAccount: '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)',
        items: {
          create: items,
        },
      },
      include: { items: true },
    })

    return NextResponse.json(statement, { status: 201 })
  } catch (error) {
    console.error('Error creating monthly vendor statement:', error)
    return NextResponse.json({ error: '월합명세서 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
