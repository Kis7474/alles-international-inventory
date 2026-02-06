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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    interface WhereClause {
      type?: string
      salespersonId?: number
      categoryId?: number
      date?: {
        gte?: Date
        lte?: Date
      }
    }

    const where: WhereClause = {}

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
        product: true,
        vendor: true,
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.salesRecord.count({ where })

    return NextResponse.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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
      productId,
      vendorId,
      itemName,
      customer,
      quantity,
      unitPrice,
      cost,
      notes,
    } = body

    // 금액 계산
    const amount = quantity * unitPrice
    
    // 원가 검증 및 costSource 설정 (매출인 경우만)
    let finalCost = 0
    let costSource = null
    
    if (type === 'SALES') {
      if (productId) {
        // 서버에서 currentCost 조회
        const { getProductCurrentCost } = await import('@/lib/product-cost')
        const costData = await getProductCurrentCost(parseInt(productId))
        
        // 총 원가 = 수량 × 단위원가
        const serverCalculatedCost = quantity * costData.cost
        
        // costSource 설정
        if (costData.source === 'CURRENT') {
          costSource = 'PRODUCT_CURRENT'
          finalCost = serverCalculatedCost
        } else if (costData.source === 'DEFAULT') {
          costSource = 'PRODUCT_DEFAULT'
          finalCost = serverCalculatedCost
        } else {
          // cost가 제공되었으면 MANUAL, 아니면 0
          costSource = cost ? 'MANUAL' : 'PRODUCT_CURRENT'
          finalCost = cost ? parseFloat(cost) : 0
        }
      } else {
        // productId가 없으면 사용자 입력값 사용
        costSource = 'MANUAL'
        finalCost = cost ? parseFloat(cost) : 0
      }
    }
    
    // 마진 계산 (매출일 경우만)
    const margin = type === 'SALES' ? amount - finalCost : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.create({
      data: {
        date: new Date(date),
        type,
        salespersonId: parseInt(salespersonId),
        categoryId: parseInt(categoryId),
        productId: productId ? parseInt(productId) : null,
        vendorId: vendorId ? parseInt(vendorId) : null,
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: finalCost,
        margin,
        marginRate,
        costSource,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
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
      productId,
      vendorId,
      itemName,
      customer,
      quantity,
      unitPrice,
      cost,
      notes,
    } = body

    // 금액 계산
    const amount = quantity * unitPrice
    
    // 원가 검증 및 costSource 설정 (매출인 경우만)
    let finalCost = 0
    let costSource = null
    
    if (type === 'SALES') {
      if (productId) {
        // 서버에서 currentCost 조회
        const { getProductCurrentCost } = await import('@/lib/product-cost')
        const costData = await getProductCurrentCost(parseInt(productId))
        
        // 총 원가 = 수량 × 단위원가
        const serverCalculatedCost = quantity * costData.cost
        
        // costSource 설정
        if (costData.source === 'CURRENT') {
          costSource = 'PRODUCT_CURRENT'
          finalCost = serverCalculatedCost
        } else if (costData.source === 'DEFAULT') {
          costSource = 'PRODUCT_DEFAULT'
          finalCost = serverCalculatedCost
        } else {
          // cost가 제공되었으면 MANUAL, 아니면 0
          costSource = cost ? 'MANUAL' : 'PRODUCT_CURRENT'
          finalCost = cost ? parseFloat(cost) : 0
        }
      } else {
        // productId가 없으면 사용자 입력값 사용
        costSource = 'MANUAL'
        finalCost = cost ? parseFloat(cost) : 0
      }
    }
    
    // 마진 계산 (매출일 경우만)
    const margin = type === 'SALES' ? amount - finalCost : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.update({
      where: { id: parseInt(id) },
      data: {
        date: new Date(date),
        type,
        salespersonId: parseInt(salespersonId),
        categoryId: parseInt(categoryId),
        productId: productId ? parseInt(productId) : null,
        vendorId: vendorId ? parseInt(vendorId) : null,
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: finalCost,
        margin,
        marginRate,
        costSource,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
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

// DELETE /api/sales - 매입매출 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      await prisma.salesRecord.deleteMany({
        where: {
          id: { in: body.ids.map((id: string | number) => parseInt(id.toString())) }
        }
      })
      return NextResponse.json({ success: true, count: body.ids.length })
    }

    // Single delete
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
