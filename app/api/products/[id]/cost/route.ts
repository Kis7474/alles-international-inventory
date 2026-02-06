import { NextRequest, NextResponse } from 'next/server'
import { getProductCurrentCost } from '@/lib/product-cost'

// GET /api/products/[id]/cost - 품목 현재 원가 조회
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

    const costData = await getProductCurrentCost(productId)

    return NextResponse.json(costData)
  } catch (error) {
    console.error('Error fetching product cost:', error)
    return NextResponse.json(
      { error: '품목 원가 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
