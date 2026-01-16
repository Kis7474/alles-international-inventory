import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateUnitCost } from '@/lib/utils'

// GET - LOT 목록 조회
export async function GET() {
  try {
    const lots = await prisma.inventoryLot.findMany({
      include: {
        item: true,
      },
      orderBy: [
        { receivedDate: 'desc' },
        { id: 'desc' },
      ],
    })
    return NextResponse.json(lots)
  } catch (error) {
    console.error('Error fetching lots:', error)
    return NextResponse.json(
      { error: 'LOT 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 입고 등록 (LOT 생성)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      itemId,
      lotCode,
      receivedDate,
      quantityReceived,
      goodsAmount,
      dutyAmount,
      domesticFreight,
      otherCost = 0,
    } = body

    // 유효성 검사
    if (!itemId || !receivedDate || !quantityReceived) {
      return NextResponse.json(
        { error: '품목, 입고일, 입고수량은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (quantityReceived <= 0) {
      return NextResponse.json(
        { error: '입고수량은 0보다 커야 합니다.' },
        { status: 400 }
      )
    }

    if (goodsAmount < 0 || dutyAmount < 0 || domesticFreight < 0 || otherCost < 0) {
      return NextResponse.json(
        { error: '금액은 음수가 될 수 없습니다.' },
        { status: 400 }
      )
    }

    // 단가 계산 (소수점 6자리까지 정밀도 유지)
    const unitCost = calculateUnitCost(
      goodsAmount || 0,
      dutyAmount || 0,
      domesticFreight || 0,
      otherCost || 0,
      quantityReceived
    )

    // LOT 생성
    const lot = await prisma.inventoryLot.create({
      data: {
        itemId,
        lotCode: lotCode || null,
        receivedDate: new Date(receivedDate),
        quantityReceived,
        quantityRemaining: quantityReceived,
        goodsAmount: goodsAmount || 0,
        dutyAmount: dutyAmount || 0,
        domesticFreight: domesticFreight || 0,
        otherCost: otherCost || 0,
        unitCost,
      },
      include: {
        item: true,
      },
    })

    // 입고 이력 생성
    await prisma.inventoryMovement.create({
      data: {
        movementDate: new Date(receivedDate),
        itemId,
        lotId: lot.id,
        type: 'IN',
        quantity: quantityReceived,
        unitCost,
        totalCost: quantityReceived * unitCost,
      },
    })

    return NextResponse.json(lot, { status: 201 })
  } catch (error) {
    console.error('Error creating lot:', error)
    return NextResponse.json(
      { error: '입고 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
