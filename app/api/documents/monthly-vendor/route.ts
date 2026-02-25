import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateVAT, generateDocumentNumber } from '@/lib/document-utils'

function getDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const categoryId = searchParams.get('categoryId')
    const type = searchParams.get('type') // SALES | PURCHASE | ALL

    if (!vendorId || !startDate || !endDate) {
      return NextResponse.json({ error: 'vendorId, startDate, endDate는 필수입니다.' }, { status: 400 })
    }

    const where: {
      vendorId: number
      date: { gte: Date; lte: Date }
      categoryId?: number
      type?: 'SALES' | 'PURCHASE'
    } = {
      vendorId: parseInt(vendorId),
      date: {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    }

    if (categoryId) where.categoryId = parseInt(categoryId)
    if (type === 'SALES' || type === 'PURCHASE') where.type = type

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
      startDate,
      endDate,
      categoryId,
      type,
    } = body as {
      vendorId: number
      recipientName?: string
      startDate: string
      endDate: string
      categoryId?: number
      type: 'SALES' | 'PURCHASE'
    }

    if (!vendorId || !startDate || !endDate || !type) {
      return NextResponse.json({ error: 'vendorId, startDate, endDate, type은 필수입니다.' }, { status: 400 })
    }

    const where: {
      vendorId: number
      type: 'SALES' | 'PURCHASE'
      date: { gte: Date; lte: Date }
      categoryId?: number
    } = {
      vendorId: parseInt(String(vendorId)),
      type,
      date: {
        gte: new Date(startDate),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    }

    if (categoryId) where.categoryId = parseInt(String(categoryId))

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

    const statement = await prisma.transactionStatement.create({
      data: {
        statementNumber,
        deliveryDate: new Date(endDate),
        recipientName: recipientName || records[0]?.vendor?.name || null,
        recipientRef: `${type} 월합명세서 (${startDate}~${endDate})`,
        subtotal,
        vatAmount,
        totalAmount,
        paymentTerms: '월합 정산',
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
