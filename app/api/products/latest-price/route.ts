import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/latest-price - 최근 거래 단가 조회
// Query params: productId, vendorId, type (PURCHASE or SALES)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const vendorId = searchParams.get('vendorId')
    const type = searchParams.get('type')

    if (!productId || !vendorId || !type) {
      return NextResponse.json(
        { error: 'productId, vendorId, type 파라미터가 필요합니다.' },
        { status: 400 }
      )
    }

    if (type !== 'PURCHASE' && type !== 'SALES') {
      return NextResponse.json(
        { error: 'type은 PURCHASE 또는 SALES이어야 합니다.' },
        { status: 400 }
      )
    }

    // 최근 거래 단가 조회: 동일 품목 + 동일 거래처 + 동일 거래유형의 가장 최근 거래
    const latestTransaction = await prisma.salesRecord.findFirst({
      where: {
        productId: parseInt(productId),
        vendorId: parseInt(vendorId),
        type: type,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        unitPrice: true,
        date: true,
      },
    })

    if (latestTransaction) {
      return NextResponse.json({
        source: 'RECENT_TRANSACTION',
        unitPrice: latestTransaction.unitPrice,
        date: latestTransaction.date,
      })
    }

    // 최근 거래가 없으면 null 반환
    return NextResponse.json({
      source: null,
      unitPrice: null,
      date: null,
    })
  } catch (error) {
    console.error('Error fetching latest price:', error)
    return NextResponse.json(
      { error: '최근 거래 단가 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
