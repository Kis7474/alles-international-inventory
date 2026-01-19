import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 재고 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (itemId) {
      // 특정 품목의 LOT별 상세 재고
      const lots = await prisma.inventoryLot.findMany({
        where: {
          itemId: parseInt(itemId),
          quantityRemaining: { gt: 0 },
        },
        include: {
          item: true,
        },
        orderBy: [
          { receivedDate: 'asc' },
          { id: 'asc' },
        ],
      })

      const totalQuantity = lots.reduce(
        (sum, lot) => sum + lot.quantityRemaining,
        0
      )

      return NextResponse.json({
        itemId: parseInt(itemId),
        totalQuantity,
        lots,
      })
    } else {
      // 전체 품목별 재고 현황
      const items = await prisma.item.findMany({
        include: {
          lots: {
            where: {
              quantityRemaining: { gt: 0 },
            },
          },
        },
        orderBy: { code: 'asc' },
      })

      const inventory = items.map((item) => {
        const totalQuantity = item.lots.reduce(
          (sum, lot) => sum + lot.quantityRemaining,
          0
        )
        const totalValue = item.lots.reduce(
          (sum, lot) => sum + lot.quantityRemaining * lot.unitCost,
          0
        )
        // 소수점 2자리로 반올림하여 금액 표시
        const roundedTotalValue = Math.round(totalValue * 100) / 100
        const avgUnitCost =
          totalQuantity > 0 ? Math.round((totalValue / totalQuantity) * 100) / 100 : 0

        return {
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          totalQuantity,
          avgUnitCost,
          totalValue: roundedTotalValue,
          lotCount: item.lots.length,
        }
      })

      return NextResponse.json(inventory)
    }
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: '재고 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
