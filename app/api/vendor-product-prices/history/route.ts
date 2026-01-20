import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/vendor-product-prices/history - 특정 거래처-품목의 가격 이력 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const vendorId = searchParams.get('vendorId')
  const productId = searchParams.get('productId')
  
  if (!vendorId || !productId) {
    return NextResponse.json({ error: 'vendorId와 productId가 필요합니다.' }, { status: 400 })
  }
  
  try {
    // 모든 가격 이력 조회 (effectiveDate 기준 내림차순)
    const history = await prisma.vendorProductPrice.findMany({
      where: {
        vendorId: parseInt(vendorId),
        productId: parseInt(productId),
      },
      include: {
        vendor: true,
        product: true,
      },
      orderBy: { effectiveDate: 'desc' },
    })
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json(
      { error: '가격 이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
