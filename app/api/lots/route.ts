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

    // LOT 생성과 입고 이력 생성을 트랜잭션으로 처리
    const lot = await prisma.$transaction(async (tx) => {
      const newLot = await tx.inventoryLot.create({
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

      await tx.inventoryMovement.create({
        data: {
          movementDate: new Date(receivedDate),
          itemId,
          lotId: newLot.id,
          type: 'IN',
          quantity: quantityReceived,
          unitCost,
          totalCost: quantityReceived * unitCost,
        },
      })

      return newLot
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

// DELETE - 입고 내역 삭제
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

    // 해당 LOT의 현재 잔량 확인
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: parseInt(id) },
    })

    if (!lot) {
      return NextResponse.json(
        { error: '해당 입고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 잔량이 입고수량과 다르면 이미 출고된 것이므로 삭제 불가
    if (lot.quantityRemaining !== lot.quantityReceived) {
      return NextResponse.json(
        { error: '이미 출고된 LOT는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // LOT와 관련 이력 삭제 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      // 관련 입출고 이력 삭제
      await tx.inventoryMovement.deleteMany({
        where: { lotId: parseInt(id) },
      })

      // LOT 삭제
      await tx.inventoryLot.delete({
        where: { id: parseInt(id) },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lot:', error)
    return NextResponse.json(
      { error: '입고 내역 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
