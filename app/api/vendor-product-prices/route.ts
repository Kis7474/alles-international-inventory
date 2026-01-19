import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/vendor-product-prices - 거래처별 품목 가격 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const vendorId = searchParams.get('vendorId')
    const productId = searchParams.get('productId')
    
    const where: any = {}
    if (vendorId) where.vendorId = parseInt(vendorId)
    if (productId) where.productId = parseInt(productId)
    
    const prices = await prisma.vendorProductPrice.findMany({
      where,
      include: {
        vendor: true,
        product: true,
      },
      orderBy: { effectiveDate: 'desc' },
    })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching vendor product prices:', error)
    return NextResponse.json(
      { error: '가격 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/vendor-product-prices - 거래처별 품목 가격 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      vendorId,
      productId,
      purchasePrice,
      salesPrice,
      effectiveDate,
      memo,
    } = body

    const price = await prisma.vendorProductPrice.create({
      data: {
        vendorId: parseInt(vendorId),
        productId: parseInt(productId),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        salesPrice: salesPrice ? parseFloat(salesPrice) : null,
        effectiveDate: new Date(effectiveDate),
        memo: memo || null,
      },
      include: {
        vendor: true,
        product: true,
      },
    })

    return NextResponse.json(price, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vendor product price:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '동일한 거래처, 품목, 적용일자의 가격이 이미 존재합니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '가격 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/vendor-product-prices - 거래처별 품목 가격 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      purchasePrice,
      salesPrice,
      effectiveDate,
      memo,
    } = body

    const price = await prisma.vendorProductPrice.update({
      where: { id: parseInt(id) },
      data: {
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        salesPrice: salesPrice ? parseFloat(salesPrice) : null,
        effectiveDate: new Date(effectiveDate),
        memo: memo || null,
      },
      include: {
        vendor: true,
        product: true,
      },
    })

    return NextResponse.json(price)
  } catch (error: any) {
    console.error('Error updating vendor product price:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '동일한 거래처, 품목, 적용일자의 가격이 이미 존재합니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '가격 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/vendor-product-prices - 거래처별 품목 가격 삭제
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

    await prisma.vendorProductPrice.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor product price:', error)
    return NextResponse.json(
      { error: '가격 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
