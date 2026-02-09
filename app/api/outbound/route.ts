import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getProductCurrentCost } from '@/lib/product-cost'

// Type definitions
interface LotWhereClause {
  quantityRemaining: { gt: number }
  productId?: number
  itemId?: number
  storageLocation?: string
}

interface MovementCreateData {
  movementDate: Date
  lot: { connect: { id: number } }
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  product?: { connect: { id: number } }
  item?: { connect: { id: number } }
  vendor?: { connect: { id: number } }
  salesperson?: { connect: { id: number } }
  salesRecord?: { connect: { id: number } }
  outboundType?: string
  notes?: string
}

// POST - FIFO 출고 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      productId, 
      itemId, 
      quantity, 
      outboundDate, 
      storageLocation,
      vendorId,
      salespersonId,
      outboundType,
      notes
    } = body

    // 유효성 검사
    if (!productId && !itemId) {
      return NextResponse.json(
        { error: '품목은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (!quantity || !outboundDate) {
      return NextResponse.json(
        { error: '수량, 출고일은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { error: '출고수량은 0보다 커야 합니다.' },
        { status: 400 }
      )
    }

    // 판매출고인 경우 거래처와 담당자는 필수
    if (outboundType === 'SALES') {
      if (!vendorId || !salespersonId) {
        return NextResponse.json(
          { error: '판매출고는 거래처와 담당자가 필수입니다.' },
          { status: 400 }
        )
      }
    }

    // 해당 품목의 사용 가능한 LOT 조회 및 FIFO 출고 처리를 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // Build where clause for LOT query
      const whereClause: LotWhereClause = {
        quantityRemaining: { gt: 0 },
      }

      if (productId) {
        whereClause.productId = productId
      } else if (itemId) {
        whereClause.itemId = itemId
      }

      if (storageLocation) {
        whereClause.storageLocation = storageLocation
      }

      const availableLots = await tx.inventoryLot.findMany({
        where: whereClause,
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

      let salesRecordId: number | undefined = undefined

      // 판매출고인 경우 SalesRecord 생성
      if (outboundType === 'SALES' && productId) {
        // 품목 정보 조회
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: {
            name: true,
            categoryId: true,
          },
        })

        if (!product) {
          throw new Error('품목 정보를 찾을 수 없습니다.')
        }

        // 원가 계산: 총 출고 원가 (수량 × currentCost)
        const costData = await getProductCurrentCost(productId)
        const totalCost = quantity * costData.cost

        // 매출가 조회: VendorProductPrice → Product.defaultSalesPrice → 0
        let unitPrice = 0
        
        // 1. VendorProductPrice에서 조회
        const vendorPrice = await tx.vendorProductPrice.findFirst({
          where: {
            vendorId: parseInt(vendorId),
            productId,
            effectiveDate: {
              lte: new Date(outboundDate),
            },
          },
          orderBy: {
            effectiveDate: 'desc',
          },
        })

        if (vendorPrice && vendorPrice.salesPrice) {
          unitPrice = vendorPrice.salesPrice
        } else {
          // 2. Product.defaultSalesPrice 사용
          const productPrice = await tx.product.findUnique({
            where: { id: productId },
            select: { defaultSalesPrice: true },
          })
          unitPrice = productPrice?.defaultSalesPrice || 0
        }

        const amount = quantity * unitPrice
        const margin = amount - totalCost
        const marginRate = amount > 0 ? (margin / amount) * 100 : 0

        // SalesRecord 생성
        const salesRecord = await tx.salesRecord.create({
          data: {
            date: new Date(outboundDate),
            type: 'SALES',
            salespersonId: parseInt(salespersonId),
            categoryId: product.categoryId || 1, // categoryId가 null인 경우 기본값 사용
            productId,
            vendorId: parseInt(vendorId),
            itemName: product.name,
            quantity,
            unitPrice,
            amount,
            cost: totalCost,
            margin,
            marginRate,
            costSource: 'OUTBOUND_AUTO',
            notes: notes || null,
          },
        })

        salesRecordId = salesRecord.id
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
        
        // 창고료 포함 원가 계산: (lot.unitCost * lot.quantityRemaining + lot.warehouseFee) / lot.quantityRemaining
        // 즉, lot.unitCost + (lot.warehouseFee / lot.quantityRemaining)
        const unitCostWithWarehouseFee = lot.quantityRemaining > 0 
          ? lot.unitCost + (lot.warehouseFee || 0) / lot.quantityRemaining 
          : lot.unitCost
        const totalCost = quantityToDeduct * unitCostWithWarehouseFee

        // LOT 잔량 감소
        await tx.inventoryLot.update({
          where: { id: lot.id },
          data: {
            quantityRemaining: lot.quantityRemaining - quantityToDeduct,
          },
        })

        // 출고 이력 생성 (productId 기반)
        const movementData: MovementCreateData = {
          movementDate: new Date(outboundDate),
          lot: { connect: { id: lot.id } },
          type: 'OUT',
          quantity: quantityToDeduct,
          unitCost: unitCostWithWarehouseFee,
          totalCost,
        }

        if (productId) {
          movementData.product = { connect: { id: productId } }
        } else if (itemId) {
          movementData.item = { connect: { id: itemId } }
        }

        // Phase 4 추가 필드
        if (vendorId) movementData.vendor = { connect: { id: parseInt(vendorId) } }
        if (salespersonId) movementData.salesperson = { connect: { id: parseInt(salespersonId) } }
        if (salesRecordId) movementData.salesRecord = { connect: { id: salesRecordId } }
        if (outboundType) movementData.outboundType = outboundType
        if (notes) movementData.notes = notes

        await tx.inventoryMovement.create({
          data: movementData,
        })

        outboundDetails.push({
          lotId: lot.id,
          lotCode: lot.lotCode,
          receivedDate: lot.receivedDate,
          quantity: quantityToDeduct,
          unitCost: unitCostWithWarehouseFee,
          totalCost,
        })

        remainingQuantity -= quantityToDeduct
      }

      return { outboundDetails, salesRecordId }
    })

    // 총 출고 원가 계산
    const totalOutboundCost = result.outboundDetails.reduce(
      (sum, detail) => sum + detail.totalCost,
      0
    )

    // 중요: 출고 시에는 updateProductCurrentCost를 호출하지 않음
    // 원가는 월말 창고료 배분 시에만 업데이트됨

    return NextResponse.json({
      success: true,
      totalQuantity: quantity,
      totalCost: totalOutboundCost,
      details: result.outboundDetails,
      salesRecordId: result.salesRecordId,
    })
  } catch (error) {
    console.error('Error processing outbound:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '출고 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET - 출고 이력 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const itemId = searchParams.get('itemId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    interface WhereClause {
      type: string
      productId?: number
      itemId?: number
      movementDate?: {
        gte?: Date
        lte?: Date
      }
    }

    const where: WhereClause = { type: 'OUT' }
    
    if (productId) {
      where.productId = parseInt(productId)
    }
    if (itemId) {
      where.itemId = parseInt(itemId)
    }
    if (startDate || endDate) {
      where.movementDate = {}
      if (startDate) {
        where.movementDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.movementDate.lte = new Date(endDate)
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        item: true,
        product: true,
        lot: true,
        vendor: true,
        salesperson: true,
        salesRecord: true,
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

// DELETE - 출고 내역 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.map((id: string | number) => parseInt(id.toString()))
      
      // 모든 출고 이력 조회
      const movements = await prisma.inventoryMovement.findMany({
        where: { id: { in: ids } },
      })

      // OUT 타입이 아닌 것이 있는지 확인
      const invalidMovements = movements.filter(m => m.type !== 'OUT')
      if (invalidMovements.length > 0) {
        return NextResponse.json(
          { error: '출고 내역만 삭제할 수 있습니다.' },
          { status: 400 }
        )
      }

      // salesRecordId 수집
      const salesRecordIds = movements
        .filter(m => m.salesRecordId !== null)
        .map(m => m.salesRecordId as number)
      const uniqueSalesRecordIds = Array.from(new Set(salesRecordIds))

      // 출고 내역 삭제 및 LOT 잔량 복구 (트랜잭션)
      await prisma.$transaction(async (tx) => {
        for (const movement of movements) {
          // 출고 내역 삭제
          await tx.inventoryMovement.delete({
            where: { id: movement.id },
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
        }

        // 연관된 SalesRecord 삭제
        // 해당 salesRecordId를 참조하는 다른 movement가 없는 경우에만 삭제
        for (const salesRecordId of uniqueSalesRecordIds) {
          const remainingMovements = await tx.inventoryMovement.count({
            where: { salesRecordId },
          })
          
          if (remainingMovements === 0) {
            await tx.salesRecord.delete({
              where: { id: salesRecordId },
            })
          }
        }
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

    const salesRecordId = movement.salesRecordId

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

      // 연관된 SalesRecord 삭제
      // 해당 salesRecordId를 참조하는 다른 movement가 없는 경우에만 삭제
      if (salesRecordId) {
        const remainingMovements = await tx.inventoryMovement.count({
          where: { salesRecordId },
        })
        
        if (remainingMovements === 0) {
          await tx.salesRecord.delete({
            where: { id: salesRecordId },
          })
        }
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
