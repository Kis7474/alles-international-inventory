import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 재고 조회 (Product 기반)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const itemId = searchParams.get('itemId') // 하위 호환성
    const storageLocation = searchParams.get('storageLocation')

    if (productId) {
      // 특정 품목의 LOT별 상세 재고
      interface LotWhereClause {
        productId: number
        quantityRemaining: { gt: number }
        storageLocation?: string
      }
      
      const whereClause: LotWhereClause = {
        productId: parseInt(productId),
        quantityRemaining: { gt: 0 },
      }
      
      if (storageLocation) {
        whereClause.storageLocation = storageLocation
      }
      
      const lots = await prisma.inventoryLot.findMany({
        where: whereClause,
        include: {
          product: {
            include: {
              purchaseVendor: true,
              category: true,
            },
          },
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
      
      // 누적 창고료 합계
      const totalAccumulatedWarehouseFee = lots.reduce(
        (sum, lot) => sum + lot.accumulatedWarehouseFee,
        0
      )

      return NextResponse.json({
        productId: parseInt(productId),
        totalQuantity,
        totalAccumulatedWarehouseFee,
        lots,
      })
    } else if (itemId) {
      // 하위 호환성: 기존 Item 기반 재고 조회
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
      // 전체 품목별 재고 현황 (Product 기반)
      interface InventoryWhereClause {
        productId: { not: null }
        quantityRemaining: { gt: number }
        storageLocation?: string
      }
      
      const whereClause: InventoryWhereClause = {
        productId: { not: null },
        quantityRemaining: { gt: 0 },
      }
      
      if (storageLocation) {
        whereClause.storageLocation = storageLocation
      }
      
      const inventory = await prisma.inventoryLot.groupBy({
        by: ['productId'],
        where: whereClause,
        _sum: {
          quantityRemaining: true,
        },
        _count: {
          id: true,
        },
      })

      const result = await Promise.all(
        inventory.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId! },
            include: {
              purchaseVendor: true,
              category: true,
            },
          })
          
          interface LotDetailWhereClause {
            productId: number | null
            quantityRemaining: { gt: number }
            storageLocation?: string
          }
          
          const lotWhereClause: LotDetailWhereClause = {
            productId: item.productId,
            quantityRemaining: { gt: 0 },
          }
          
          if (storageLocation) {
            lotWhereClause.storageLocation = storageLocation
          }
          
          const lots = await prisma.inventoryLot.findMany({
            where: lotWhereClause,
            orderBy: { receivedDate: 'asc' },
          })

          const totalValue = lots.reduce(
            (sum, lot) => sum + lot.quantityRemaining * lot.unitCost,
            0
          )
          
          // 누적 창고료 합계
          const totalAccumulatedWarehouseFee = lots.reduce(
            (sum, lot) => sum + lot.accumulatedWarehouseFee,
            0
          )
          
          const totalQuantity = item._sum.quantityRemaining || 0
          const avgUnitCost = totalQuantity > 0 ? Math.round((totalValue / totalQuantity) * 100) / 100 : 0
          
          // 창고료 포함 현재 가치 (입고원가 + 누적창고료)
          const currentValue = totalValue + totalAccumulatedWarehouseFee
          
          // 창고료 포함 평균 단가
          const avgUnitCostWithWarehouseFee = totalQuantity > 0 
            ? Math.round((currentValue / totalQuantity) * 100) / 100 
            : 0

          return {
            productId: item.productId,
            productName: product?.name,
            productCode: product?.code,
            unit: product?.unit,
            purchaseVendor: product?.purchaseVendor?.name,
            category: product?.category?.nameKo,
            totalQuantity,
            avgUnitCost,
            totalValue: Math.round(totalValue * 100) / 100,
            totalAccumulatedWarehouseFee: Math.round(totalAccumulatedWarehouseFee * 100) / 100,
            currentValue: Math.round(currentValue * 100) / 100,
            avgUnitCostWithWarehouseFee,
            lotCount: item._count.id,
            lots,
          }
        })
      )

      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: '재고 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
