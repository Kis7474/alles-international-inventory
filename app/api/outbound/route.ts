import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - FIFO 출고 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, quantity, outboundDate } = body

    // 유효성 검사
    if (!itemId || !quantity || !outboundDate) {
      return NextResponse.json(
        { error: '품목, 수량, 출고일은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: '출고수량은 0보다 커야 합니다.' },
        { status: 400 }
      )
    }

    // 해당 품목의 사용 가능한 LOT 조회 및 FIFO 출고 처리를 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      const availableLots = await tx.inventoryLot.findMany({
        where: {
          itemId,
          quantityRemaining: { gt: 0 },
        },
        orderBy: [
          { receivedDate: 'asc' },
          { id: 'asc' },
        ],
      })

      // 총 재고 확인
      const totalAvailable = availableLots.reduce(
        (sum, lot) => sum + lot.quantityRemaining,
        0
      )

      if (totalAvailable < quantity) {
        throw new Error(
          `재고가 부족합니다. 현재 재고: ${totalAvailable}, 요청 수량: ${quantity}`
        )
      }

      // FIFO 출고 처리
      let remainingQuantity = quantity
      const outboundDetails: Array<{
        lotId: number
        lotCode: string | null
        receivedDate: Date
        quantity: number
        unitCost: number
        totalCost: number
      }> = []

      for (const lot of availableLots) {
        if (remainingQuantity <= 0) break

        const quantityToDeduct = Math.min(remainingQuantity, lot.quantityRemaining)
        const totalCost = quantityToDeduct * lot.unitCost

        // LOT 잔량 감소
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            quantityRemaining: lot.quantityRemaining - quantityToDeduct,
          },
        })

        // 출고 이력 생성
        await tx.inventoryMovement.create({
          data: {
            movementDate: new Date(outboundDate),
            itemId,
            lotId: lot.id,
            type: 'OUT',
            quantity: quantityToDeduct,
            unitCost: lot.unitCost,
            totalCost,
          },
        })

        outboundDetails.push({
          lotId: lot.id,
          lotCode: lot.lotCode,
          receivedDate: lot.receivedDate,
          quantity: quantityToDeduct,
          unitCost: lot.unitCost,
          totalCost,
        })

        remainingQuantity -= quantityToDeduct
      }

      return outboundDetails
    })

    // 총 출고 원가 계산
    const totalOutboundCost = result.reduce(
      (sum, detail) => sum + detail.totalCost,
      0
    )

    return NextResponse.json({
      success: true,
      totalQuantity: quantity,
      totalCost: totalOutboundCost,
      details: result,
    })
  } catch (error) {
    console.error('Error processing outbound:', error)
    return NextResponse.json(
      { error: '출고 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET - 출고 이력 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    const where: { type: string; itemId?: number } = { type: 'OUT' }
    if (itemId) {
      where.itemId = parseInt(itemId)
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        item: true,
        lot: true,
      },
      orderBy: [
        { movementDate: 'desc' },
        { id: 'desc' },
      ],
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Error fetching outbound history:', error)
    return NextResponse.json(
      { error: '출고 이력 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 출고 내역 삭제
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

    // 해당 출고 이력 조회
    const movement = await prisma.inventoryMovement.findUnique({
      where: { id: parseInt(id) },
    })

    if (!movement) {
      return NextResponse.json(
        { error: '해당 출고 내역을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (movement.type !== 'OUT') {
      return NextResponse.json(
        { error: '출고 내역만 삭제할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 출고 내역 삭제 및 LOT 잔량 복구 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      // 출고 내역 삭제
      await tx.inventoryMovement.delete({
        where: { id: parseInt(id) },
      })

      // LOT 잔량 복구 (출고 취소이므로 다시 더함)
      if (movement.lotId) {
        await tx.inventoryLot.update({
          where: { id: movement.lotId },
          data: {
            quantityRemaining: {
              increment: movement.quantity,
            },
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting outbound record:', error)
    return NextResponse.json(
      { error: '출고 내역 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
