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

      return NextResponse.json({
        productId: parseInt(productId),
        totalQuantity,
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

      // 창고료 조회 (현재 월)
      const now = new Date()
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      
      const storageExpenses = await prisma.storageExpense.findMany({
        where: {
          period: currentPeriod,
        },
      })
      
      // 총 창고료
      const totalStorageExpense = storageExpenses.reduce(
        (sum, expense) => sum + expense.amount, 0
      )
      
      // 총 재고 수량 계산
      const totalInventoryQuantity = inventory.reduce(
        (sum, item) => sum + (item._sum.quantityRemaining || 0), 0
      )
      
      // 단위당 창고료 배분 (수량 기준)
      const storageExpensePerUnit = totalInventoryQuantity > 0 
        ? totalStorageExpense / totalInventoryQuantity 
        : 0

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
          
          const totalQuantity = item._sum.quantityRemaining || 0
          const avgUnitCostWithoutStorage = totalQuantity > 0 ? Math.round((totalValue / totalQuantity) * 100) / 100 : 0
          
          // 창고료 반영된 평균 단가
          const avgUnitCost = avgUnitCostWithoutStorage + storageExpensePerUnit
          
          // 배분된 창고료
          const allocatedStorageExpense = storageExpensePerUnit * totalQuantity
          
          // 창고료 포함 총 가치
          const totalValueWithStorage = avgUnitCost * totalQuantity

          return {
            productId: item.productId,
            productName: product?.name,
            productCode: product?.code,
            unit: product?.unit,
            purchaseVendor: product?.purchaseVendor?.name,
            category: product?.category?.nameKo,
            totalQuantity,
            avgUnitCost: Math.round(avgUnitCost * 100) / 100,
            avgUnitCostWithoutStorage: avgUnitCostWithoutStorage,
            allocatedStorageExpense: Math.round(allocatedStorageExpense * 100) / 100,
            totalValue: Math.round(totalValue * 100) / 100,
            totalValueWithStorage: Math.round(totalValueWithStorage * 100) / 100,
            lotCount: item._count.id,
            lots,
            // 창고료 정보
            storageExpensePerUnit: Math.round(storageExpensePerUnit * 100) / 100,
            totalStorageExpense: totalStorageExpense,
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
