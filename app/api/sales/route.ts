import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sales - 매입매출 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const salespersonId = searchParams.get('salespersonId')
    const categoryId = searchParams.get('categoryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (type) {
      where.type = type
    }
    if (salespersonId) {
      where.salespersonId = parseInt(salespersonId)
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const sales = await prisma.salesRecord.findMany({
      where,
      include: {
        salesperson: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: '매입매출 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/sales - 매입매출 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      type,
      salespersonId,
      categoryId,
      itemName,
      customer,
      quantity,
      unitPrice,
      cost,
      notes,
    } = body

    // 금액 계산
    const amount = quantity * unitPrice
    
    // 마진 계산 (매출일 경우만)
    const margin = type === 'SALES' ? amount - (cost || 0) : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.create({
      data: {
        date: new Date(date),
        type,
        salespersonId: parseInt(salespersonId),
        categoryId: parseInt(categoryId),
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: type === 'SALES' ? parseFloat(cost || 0) : 0,
        margin,
        marginRate,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
      },
    })

    return NextResponse.json(salesRecord, { status: 201 })
  } catch (error) {
    console.error('Error creating sales record:', error)
    return NextResponse.json(
      { error: '매입매출 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/sales - 매입매출 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      date,
      type,
      salespersonId,
      categoryId,
      itemName,
      customer,
      quantity,
      unitPrice,
      cost,
      notes,
    } = body

    // 금액 계산
    const amount = quantity * unitPrice
    
    // 마진 계산 (매출일 경우만)
    const margin = type === 'SALES' ? amount - (cost || 0) : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.update({
      where: { id: parseInt(id) },
      data: {
        date: new Date(date),
        type,
        salespersonId: parseInt(salespersonId),
        categoryId: parseInt(categoryId),
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: type === 'SALES' ? parseFloat(cost || 0) : 0,
        margin,
        marginRate,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
      },
    })

    return NextResponse.json(salesRecord)
  } catch (error) {
    console.error('Error updating sales record:', error)
    return NextResponse.json(
      { error: '매입매출 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales - 매입매출 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await prisma.salesRecord.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sales record:', error)
    return NextResponse.json(
      { error: '매입매출 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
