import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sales-product-prices - 단가 이력 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'productId가 필요합니다.' },
        { status: 400 }
      )
    }

    const prices = await prisma.salesProductPrice.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { effectiveDate: 'desc' },
    })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching product prices:', error)
    return NextResponse.json(
      { error: '단가 이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/sales-product-prices - 단가 이력 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, effectiveDate, purchasePrice, salesPrice, notes } = body

    const price = await prisma.salesProductPrice.create({
      data: {
        productId: parseInt(productId),
        effectiveDate: new Date(effectiveDate),
        purchasePrice: parseFloat(purchasePrice || 0),
        salesPrice: parseFloat(salesPrice || 0),
        notes: notes || null,
      },
    })

    return NextResponse.json(price, { status: 201 })
  } catch (error) {
    console.error('Error creating product price:', error)
    return NextResponse.json(
      { error: '단가 이력 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/sales-product-prices - 단가 이력 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, effectiveDate, purchasePrice, salesPrice, notes } = body

    const price = await prisma.salesProductPrice.update({
      where: { id: parseInt(id) },
      data: {
        effectiveDate: new Date(effectiveDate),
        purchasePrice: parseFloat(purchasePrice || 0),
        salesPrice: parseFloat(salesPrice || 0),
        notes: notes || null,
      },
    })

    return NextResponse.json(price)
  } catch (error) {
    console.error('Error updating product price:', error)
    return NextResponse.json(
      { error: '단가 이력 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales-product-prices - 단가 이력 삭제
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

    await prisma.salesProductPrice.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product price:', error)
    return NextResponse.json(
      { error: '단가 이력 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
