import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/warehouse/flow - 입출고 흐름 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const storageLocation = searchParams.get('storageLocation')

    if (!productId) {
      return NextResponse.json({ error: '품목 ID가 필요합니다.' }, { status: 400 })
    }

    const parsedProductId = parseInt(productId)

    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
      select: { id: true, name: true, code: true, unit: true },
    })

    if (!product) {
      return NextResponse.json({ error: '품목을 찾을 수 없습니다.' }, { status: 404 })
    }

    interface DateFilter {
      gte?: Date
      lte?: Date
    }
    const dateFilter: DateFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    interface MovementWhere {
      productId: number
      type: string
      movementDate?: DateFilter
      lot?: {
        storageLocation?: string
      }
    }

    const where: MovementWhere = {
      productId: parsedProductId,
      type: 'OUT',
      ...(Object.keys(dateFilter).length > 0 ? { movementDate: dateFilter } : {}),
    }

    if (storageLocation && ['WAREHOUSE', 'OFFICE'].includes(storageLocation)) {
      where.lot = { storageLocation }
    }

    const outboundMovements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        lot: true,
        vendor: { select: { name: true } },
        salesperson: { select: { name: true } },
        salesRecord: { select: { id: true } },
      },
      orderBy: [{ movementDate: 'asc' }, { id: 'asc' }],
    })

    interface LotWhere {
      productId: number
      receivedDate?: DateFilter
      storageLocation?: string
    }

    const lotWhere: LotWhere = {
      productId: parsedProductId,
      ...(Object.keys(dateFilter).length > 0 ? { receivedDate: dateFilter } : {}),
    }

    if (storageLocation && ['WAREHOUSE', 'OFFICE'].includes(storageLocation)) {
      lotWhere.storageLocation = storageLocation
    }

    const inboundLots = await prisma.inventoryLot.findMany({
      where: lotWhere,
      orderBy: [{ receivedDate: 'asc' }, { id: 'asc' }],
    })

    const inboundTimeline = inboundLots.map((lot) => ({
      id: lot.id,
      date: lot.receivedDate.toISOString(),
      type: 'IN' as const,
      quantity: lot.quantityReceived,
      lotCode: lot.lotCode,
      storageLocation: lot.storageLocation,
      unitCost: lot.unitCost,
      reference: lot.importExportId ? `수입등록 #${lot.importExportId}` : `LOT #${lot.id}`,
    }))

    const outboundTimeline = outboundMovements.map((movement) => ({
      id: movement.id,
      date: movement.movementDate.toISOString(),
      type: 'OUT' as const,
      quantity: movement.quantity,
      lotCode: movement.lot?.lotCode || (movement.lotId ? `LOT-${movement.lotId}` : null),
      storageLocation: movement.lot?.storageLocation || null,
      unitCost: movement.unitCost,
      outboundType: movement.outboundType,
      vendorName: movement.vendor?.name || null,
      salespersonName: movement.salesperson?.name || null,
      salesRecordId: movement.salesRecord?.id || null,
      notes: movement.notes,
    }))

    const timeline = [...inboundTimeline, ...outboundTimeline].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const totalIn = inboundLots.reduce((sum, lot) => sum + lot.quantityReceived, 0)
    const totalOut = outboundMovements.reduce((sum, movement) => sum + movement.quantity, 0)

    const currentStock = await prisma.inventoryLot.aggregate({
      _sum: { quantityRemaining: true },
      where: {
        productId: parsedProductId,
        ...(storageLocation && ['WAREHOUSE', 'OFFICE'].includes(storageLocation)
          ? { storageLocation }
          : {}),
      },
    })

    return NextResponse.json({
      product,
      timeline,
      summary: {
        totalIn,
        totalOut,
        currentStock: currentStock._sum.quantityRemaining || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching warehouse flow:', error)
    return NextResponse.json({ error: '입출고 흐름 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
