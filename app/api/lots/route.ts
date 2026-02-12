import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateUnitCost } from '@/lib/utils'
import { createAutoPurchaseRecord } from '@/lib/purchase-auto'
import { generateLotCode } from '@/lib/code-generator'

// Constants
const DEFAULT_SALESPERSON_ID = 1 // 입고에는 담당자가 없으므로 기본값

// GET - LOT 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const productId = searchParams.get('productId')
    const storageLocation = searchParams.get('storageLocation')
    const importExportId = searchParams.get('importExportId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    interface WhereClause {
      receivedDate?: {
        gte?: Date
        lte?: Date
      }
      productId?: number
      storageLocation?: string
      importExportId?: number
    }

    const where: WhereClause = {}

    if (startDate || endDate) {
      where.receivedDate = {}
      if (startDate) {
        where.receivedDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.receivedDate.lte = new Date(endDate)
      }
    }
    if (productId) {
      where.productId = parseInt(productId)
    }
    if (storageLocation) {
      where.storageLocation = storageLocation
    }
    if (importExportId) {
      where.importExportId = parseInt(importExportId)
    }

    const lots = await prisma.inventoryLot.findMany({
      where,
      include: {
        item: true,
        product: {
          include: {
            category: true,
          },
        },
        importExport: {
          select: {
            id: true,
            date: true,
            type: true,
          },
        },
      },
      orderBy: [
        { receivedDate: 'desc' },
        { id: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.inventoryLot.count({ where })

    return NextResponse.json({
      data: lots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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
      productId,
      lotCode,
      receivedDate,
      quantityReceived,
      goodsAmount,
      dutyAmount,
      domesticFreight,
      otherCost = 0,
      storageLocation = 'WAREHOUSE',
    } = body

    // 유효성 검사 - itemId 또는 productId 중 하나는 필수
    if (!itemId && !productId) {
      return NextResponse.json(
        { error: '품목은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (!receivedDate || !quantityReceived) {
      return NextResponse.json(
        { error: '입고일, 입고수량은 필수 항목입니다.' },
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
      // lotCode가 비어있으면 자동 생성
      const finalLotCode = lotCode || await generateLotCode(tx)

      const newLot = await tx.inventoryLot.create({
        data: {
          itemId: itemId || null,
          productId: productId || null,
          lotCode: finalLotCode,
          receivedDate: new Date(receivedDate),
          quantityReceived,
          quantityRemaining: quantityReceived,
          goodsAmount: goodsAmount || 0,
          dutyAmount: dutyAmount || 0,
          domesticFreight: domesticFreight || 0,
          otherCost: otherCost || 0,
          unitCost,
          storageLocation,
        },
        include: {
          item: true,
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      // Only create movement if itemId exists (for backward compatibility)
      if (itemId) {
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
      }

      return newLot
    })

    // 입고 등록 시 매입(PURCHASE) 자동 생성
    // 중복 방지: importExportId가 없는 경우(수동 입고)만 매입 자동 생성
    if (productId && lot && !lot.importExportId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      })
      
      if (product && product.purchaseVendorId) {
        const purchasePrice = product.defaultPurchasePrice ?? unitCost
        
        if (purchasePrice > 0) {
          await createAutoPurchaseRecord({
            productId: product.id,
            vendorId: product.purchaseVendorId,
            salespersonId: DEFAULT_SALESPERSON_ID,
            categoryId: product.categoryId || 1,
            quantity: quantityReceived,
            unitPrice: purchasePrice,
            date: new Date(receivedDate),
            itemName: product.name,
            costSource: 'INBOUND_AUTO',
            notes: `입고 LOT ${lot.id}에서 자동생성`,
          })
        }
      }
    }

    return NextResponse.json(lot, { status: 201 })
  } catch (error) {
    console.error('Error creating lot:', error)
    return NextResponse.json(
      { error: '입고 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - LOT 수정 (보관위치 변경 등)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, storageLocation } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'LOT ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const updateData: { storageLocation?: string } = {}
    
    if (storageLocation) {
      if (!['WAREHOUSE', 'OFFICE'].includes(storageLocation)) {
        return NextResponse.json(
          { error: '보관위치는 WAREHOUSE 또는 OFFICE만 가능합니다.' },
          { status: 400 }
        )
      }
      updateData.storageLocation = storageLocation
    }
    
    const lot = await prisma.inventoryLot.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        product: true,
        importExport: {
          select: { id: true, date: true, type: true }
        }
      }
    })
    
    return NextResponse.json(lot)
  } catch (error) {
    console.error('Error updating lot:', error)
    return NextResponse.json(
      { error: 'LOT 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 입고 내역 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.map((id: string | number) => parseInt(id.toString()))
      
      // 모든 LOT의 잔량 확인
      const lots = await prisma.inventoryLot.findMany({
        where: { id: { in: ids } },
      })

      // 잔량이 입고수량과 다른 LOT가 있는지 확인
      const invalidLots = lots.filter(lot => lot.quantityRemaining !== lot.quantityReceived)
      if (invalidLots.length > 0) {
        return NextResponse.json(
          { error: '이미 출고된 LOT는 삭제할 수 없습니다.' },
          { status: 400 }
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.inventoryMovement.deleteMany({
          where: { lotId: { in: ids } },
        })
        await tx.inventoryLot.deleteMany({
          where: { id: { in: ids } },
        })
      })

      return NextResponse.json({ success: true, count: body.ids.length })
    }

    // Single delete
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
