import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sales-product-status - 품목별 현황 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (productId) {
      // 특정 품목의 상세 현황
      const product = await prisma.salesProduct.findUnique({
        where: { id: parseInt(productId) },
        include: {
          prices: {
            orderBy: { effectiveDate: 'desc' },
          },
          sales: {
            include: {
              salesperson: true,
              category: true,
              vendor: true,
            },
            orderBy: { date: 'desc' },
          },
        },
      })

      if (!product) {
        return NextResponse.json(
          { error: '품목을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      // 매입/매출 집계
      const purchases = product.sales.filter((s) => s.type === 'PURCHASE')
      const sales = product.sales.filter((s) => s.type === 'SALES')

      const totalPurchaseQty = purchases.reduce((sum, p) => sum + p.quantity, 0)
      const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.amount, 0)
      const totalSalesQty = sales.reduce((sum, s) => sum + s.quantity, 0)
      const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0)
      const currentStock = totalPurchaseQty - totalSalesQty

      return NextResponse.json({
        product,
        summary: {
          totalPurchaseQty,
          totalPurchaseAmount,
          totalSalesQty,
          totalSalesAmount,
          currentStock,
        },
      })
    } else {
      // 전체 품목 현황 목록
      const products = await prisma.salesProduct.findMany({
        include: {
          prices: {
            orderBy: { effectiveDate: 'desc' },
            take: 1, // 최신 단가만
          },
          sales: true,
        },
        orderBy: { name: 'asc' },
      })

      // 각 품목별 집계
      const productStatus = products.map((product) => {
        const purchases = product.sales.filter((s) => s.type === 'PURCHASE')
        const sales = product.sales.filter((s) => s.type === 'SALES')

        const totalPurchaseQty = purchases.reduce((sum, p) => sum + p.quantity, 0)
        const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.amount, 0)
        const totalSalesQty = sales.reduce((sum, s) => sum + s.quantity, 0)
        const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0)
        const currentStock = totalPurchaseQty - totalSalesQty

        const latestPrice = product.prices[0] || null

        return {
          id: product.id,
          name: product.name,
          unit: product.unit,
          description: product.description,
          totalPurchaseQty,
          totalPurchaseAmount,
          totalSalesQty,
          totalSalesAmount,
          currentStock,
          latestPurchasePrice: latestPrice?.purchasePrice || 0,
          latestSalesPrice: latestPrice?.salesPrice || 0,
        }
      })

      return NextResponse.json(productStatus)
    }
  } catch (error) {
    console.error('Error fetching product status:', error)
    return NextResponse.json(
      { error: '품목 현황 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
