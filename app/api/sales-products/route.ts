import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sales-products - 품목 목록 조회
export async function GET(request: NextRequest) {
  try {
    const products = await prisma.salesProduct.findMany({
      include: {
        prices: {
          orderBy: { effectiveDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching sales products:', error)
    return NextResponse.json(
      { error: '품목 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/sales-products - 품목 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, unit, notes, purchasePrice, salesPrice, effectiveDate } = body

    // 품목 생성 및 초기 단가 이력 생성
    const product = await prisma.salesProduct.create({
      data: {
        name,
        description: description || null,
        unit: unit || 'EA',
        notes: notes || null,
        prices: {
          create: {
            effectiveDate: new Date(effectiveDate || new Date()),
            purchasePrice: parseFloat(purchasePrice || 0),
            salesPrice: parseFloat(salesPrice || 0),
          },
        },
      },
      include: {
        prices: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating sales product:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 품목명입니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '품목 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/sales-products - 품목 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, unit, notes } = body

    const product = await prisma.salesProduct.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || null,
        unit: unit || 'EA',
        notes: notes || null,
      },
      include: {
        prices: {
          orderBy: { effectiveDate: 'desc' },
        },
      },
    })

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('Error updating sales product:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 품목명입니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '품목 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-products - 품목 삭제
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

    // 판매 내역이 있는지 확인
    const salesCount = await prisma.salesRecord.count({
      where: { productId: parseInt(id) },
    })

    if (salesCount > 0) {
      return NextResponse.json(
        { error: '판매 내역이 있는 품목은 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    await prisma.salesProduct.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sales product:', error)
    return NextResponse.json(
      { error: '품목 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
