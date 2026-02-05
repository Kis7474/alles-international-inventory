import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/[id] - 품목 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: '유효하지 않은 품목 ID입니다.' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        purchaseVendor: true,
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
        },
        vendorPrices: {
          include: {
            vendor: true,
          },
          orderBy: { effectiveDate: 'desc' },
        },
        monthlyCosts: {
          orderBy: { yearMonth: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: '품목을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product details:', error)
    return NextResponse.json(
      { error: '품목 상세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
