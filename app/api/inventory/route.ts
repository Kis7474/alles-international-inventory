import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 재고 조회 (Product 기반)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const itemId = searchParams.get('itemId') // 하위 호환성
    const storageLocation = searchParams.get('storageLocation')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

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
      // 전체 품목별 재고 현황 (Product 기반) - with pagination
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

      // 창고료 조회 (가장 최근 배분된 월)
      const latestWarehouseFee = await prisma.warehouseFee.findFirst({
        where: {
          distributedAt: { not: null },
        },
        orderBy: {
          yearMonth: 'desc',
        },
      })
      
      const totalStorageExpense = latestWarehouseFee?.totalFee || 0
      const latestDistributedPeriod = latestWarehouseFee?.yearMonth || null
      
      // 총 재고 수량 계산
      const totalInventoryQuantity = inventory.reduce(
        (sum, item) => sum + (item._sum.quantityRemaining || 0), 0
      )
      
      // 단위당 창고료 배분 (수량 기준) - 정보 표시용
      const storageExpensePerUnit = totalInventoryQuantity > 0 
        ? totalStorageExpense / totalInventoryQuantity 
        : 0

      // Apply pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedInventory = inventory.slice(startIndex, endIndex)

      const result = await Promise.all(
        paginatedInventory.map(async (item) => {
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
          
          // 창고료 반영된 평균 단가 계산
          // LOT의 warehouseFee는 이미 모든 월의 누적 창고료이므로 항상 이를 사용
          const allocatedStorageExpense = lots.reduce(
            (sum, lot) => sum + (lot.warehouseFee || 0),
            0
          )
          const avgUnitCost = totalQuantity > 0 ? avgUnitCostWithoutStorage + (allocatedStorageExpense / totalQuantity) : avgUnitCostWithoutStorage
          
          // 창고료 포함 총 가치
          const totalValueWithStorage = avgUnitCost * totalQuantity

          return {
            productId: item.productId,
            productName: product?.name,
            productCode: product?.code,
            unit: product?.unit,
            purchaseVendor: product?.purchaseVendor?.name,
            category: product?.category?.nameKo,
            currentCost: product?.currentCost, // 품목별 현재 원가
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
            latestDistributedPeriod: latestDistributedPeriod,
          }
        })
      )

      return NextResponse.json({
        data: result,
        pagination: {
          page,
          limit,
          total: inventory.length,
          totalPages: Math.ceil(inventory.length / limit),
        },
      })
    }
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: '재고 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
