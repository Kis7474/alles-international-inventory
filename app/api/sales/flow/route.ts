import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface PurchaseFlow {
  id: number
  date: string
  type: 'DOMESTIC_PURCHASE' | 'IMPORT'
  quantity: number
  unitPrice: number
  amount: number
  vendorName: string
  importExportId?: number
  inventoryLotId?: number
  costSource: string | null
}

interface InventoryFlow {
  lotId: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  storageLocation: string
  unitCost: number
  warehouseFee: number
}

interface SalesFlow {
  id: number
  date: string
  quantity: number
  unitPrice: number
  amount: number
  vendorName: string
  customer: string | null
  margin: number
  marginRate: number
}

interface FlowItem {
  purchase: PurchaseFlow
  inventory?: InventoryFlow
  sales: SalesFlow[]
}

// GET /api/sales/flow - 매입-매출 흐름 추적 API
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!productId) {
      return NextResponse.json(
        { error: '품목 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // Get product info
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: { id: true, name: true, code: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: '품목을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Build date filter
    interface DateFilter {
      gte?: Date
      lte?: Date
    }
    const dateFilter: DateFilter = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    // Get all purchases for this product
    const purchases = await prisma.salesRecord.findMany({
      where: {
        productId: parseInt(productId),
        type: 'PURCHASE',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        vendor: { select: { name: true } },
        linkedSalesRecord: {
          include: {
            vendor: { select: { name: true } }
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Get all sales for this product
    const sales = await prisma.salesRecord.findMany({
      where: {
        productId: parseInt(productId),
        type: 'SALES',
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: {
        vendor: { select: { name: true } }
      },
      orderBy: { date: 'asc' }
    })

    // Get inventory lots for this product
    const lots = await prisma.inventoryLot.findMany({
      where: {
        productId: parseInt(productId),
        ...(Object.keys(dateFilter).length > 0 ? { receivedDate: dateFilter } : {})
      },
      include: {
        importExport: true
      },
      orderBy: { receivedDate: 'asc' }
    })

    // Build flow data
    const flows: FlowItem[] = []
    
    // Map purchases to flows
    for (const purchase of purchases) {
      const purchaseType = purchase.costSource === 'IMPORT_AUTO' ? 'IMPORT' : 'DOMESTIC_PURCHASE'
      
      const purchaseFlow: PurchaseFlow = {
        id: purchase.id,
        date: purchase.date.toISOString(),
        type: purchaseType,
        quantity: purchase.quantity,
        unitPrice: purchase.unitPrice,
        amount: purchase.amount,
        vendorName: purchase.vendor?.name || '알 수 없음',
        importExportId: purchase.importExportId || undefined,
        costSource: purchase.costSource
      }

      // Find related inventory lot
      let inventoryFlow: InventoryFlow | undefined
      if (purchase.importExportId) {
        const lot = lots.find(l => l.importExportId === purchase.importExportId)
        if (lot) {
          inventoryFlow = {
            lotId: lot.id,
            lotCode: lot.lotCode,
            receivedDate: lot.receivedDate.toISOString(),
            quantityReceived: lot.quantityReceived,
            quantityRemaining: lot.quantityRemaining,
            storageLocation: lot.storageLocation,
            unitCost: lot.unitCost,
            warehouseFee: lot.warehouseFee
          }
          purchaseFlow.inventoryLotId = lot.id
        }
      }

      // Find related sales (linked to this purchase)
      const linkedSales: SalesFlow[] = []
      const linkedSalesIds = new Set<number>()
      
      // Path 1: Direct linked sales via linkedSalesRecord
      if (purchase.linkedSalesRecord) {
        linkedSales.push({
          id: purchase.linkedSalesRecord.id,
          date: purchase.linkedSalesRecord.date.toISOString(),
          quantity: purchase.linkedSalesRecord.quantity,
          unitPrice: purchase.linkedSalesRecord.unitPrice,
          amount: purchase.linkedSalesRecord.amount,
          vendorName: purchase.linkedSalesRecord.vendor?.name || '알 수 없음',
          customer: purchase.linkedSalesRecord.customer,
          margin: purchase.linkedSalesRecord.margin,
          marginRate: purchase.linkedSalesRecord.marginRate
        })
        linkedSalesIds.add(purchase.linkedSalesRecord.id)
      }
      
      // Path 2: LOT-based sales via InventoryMovement
      if (inventoryFlow) {
        const outboundMovements = await prisma.inventoryMovement.findMany({
          where: {
            lotId: inventoryFlow.lotId,
            type: 'OUT',
            salesRecordId: { not: null }
          },
          include: {
            salesRecord: {
              include: { vendor: { select: { name: true } } }
            }
          }
        })
        
        for (const movement of outboundMovements) {
          if (movement.salesRecord && !linkedSalesIds.has(movement.salesRecord.id)) {
            linkedSales.push({
              id: movement.salesRecord.id,
              date: movement.salesRecord.date.toISOString(),
              quantity: movement.salesRecord.quantity,
              unitPrice: movement.salesRecord.unitPrice,
              amount: movement.salesRecord.amount,
              vendorName: movement.salesRecord.vendor?.name || '알 수 없음',
              customer: movement.salesRecord.customer,
              margin: movement.salesRecord.margin,
              marginRate: movement.salesRecord.marginRate
            })
            linkedSalesIds.add(movement.salesRecord.id)
          }
        }
      }

      flows.push({
        purchase: purchaseFlow,
        inventory: inventoryFlow,
        sales: linkedSales
      })
    }

    // Path 3: Collect unlinked sales (independent sales not linked to any purchase)
    const allLinkedSalesIds = new Set<number>()
    for (const flow of flows) {
      for (const sale of flow.sales) {
        allLinkedSalesIds.add(sale.id)
      }
    }
    
    const unlinkedSales: SalesFlow[] = sales
      .filter(s => !allLinkedSalesIds.has(s.id))
      .map(s => ({
        id: s.id,
        date: s.date.toISOString(),
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        amount: s.amount,
        vendorName: s.vendor?.name || '알 수 없음',
        customer: s.customer,
        margin: s.margin,
        marginRate: s.marginRate
      }))

    // Calculate summary
    const totalPurchaseQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0)
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.amount, 0)
    const totalSalesQuantity = sales.reduce((sum, s) => sum + s.quantity, 0)
    const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0)
    const totalMargin = sales.reduce((sum, s) => sum + s.margin, 0)
    const averageMarginRate = totalSalesAmount > 0 ? (totalMargin / totalSalesAmount) * 100 : 0

    // Calculate current stock from inventory lots
    const currentStock = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0)

    const response = {
      product: {
        id: product.id,
        name: product.name,
        code: product.code
      },
      flows,
      unlinkedSales,
      summary: {
        totalPurchaseQuantity,
        totalPurchaseAmount,
        totalSalesQuantity,
        totalSalesAmount,
        currentStock,
        totalMargin,
        averageMarginRate
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching sales flow:', error)
    return NextResponse.json(
      { error: '흐름 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
