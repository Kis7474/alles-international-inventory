import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 현재 월의 시작일과 종료일
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // 전월의 시작일과 종료일
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

    // 당월 매출 데이터
    const currentMonthSales = await prisma.salesRecord.aggregate({
      where: {
        date: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
        type: 'SALES',
      },
      _sum: {
        amount: true,
        margin: true,
      },
      _count: {
        id: true,
      },
    })

    // 전월 매출 데이터
    const lastMonthSales = await prisma.salesRecord.aggregate({
      where: {
        date: {
          gte: lastMonthStart,
          lt: lastMonthEnd,
        },
        type: 'SALES',
      },
      _sum: {
        amount: true,
        margin: true,
      },
    })

    // 증감률 계산
    const currentSales = currentMonthSales._sum.amount || 0
    const lastSales = lastMonthSales._sum.amount || 0
    const salesGrowth =
      lastSales > 0 ? ((currentSales - lastSales) / lastSales) * 100 : 0

    const currentMargin = currentMonthSales._sum.margin || 0
    const lastMargin = lastMonthSales._sum.margin || 0
    const marginGrowth =
      lastMargin > 0 ? ((currentMargin - lastMargin) / lastMargin) * 100 : 0

    // 당월 담당자별 통계
    const salespersonStats = await prisma.salesRecord.groupBy({
      by: ['salespersonId'],
      where: {
        date: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
        type: 'SALES',
      },
      _sum: {
        amount: true,
        margin: true,
      },
    })

    const salespersonData = await Promise.all(
      salespersonStats.map(async (stat) => {
        const salesperson = await prisma.salesperson.findUnique({
          where: { id: stat.salespersonId },
        })
        return {
          salesperson,
          totalSales: stat._sum.amount || 0,
          totalMargin: stat._sum.margin || 0,
        }
      })
    )

    // 당월 카테고리별 통계
    const categoryStats = await prisma.salesRecord.groupBy({
      by: ['categoryId'],
      where: {
        date: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
        type: 'SALES',
      },
      _sum: {
        amount: true,
        margin: true,
      },
    })

    const categoryData = await Promise.all(
      categoryStats.map(async (stat) => {
        const category = await prisma.productCategory.findUnique({
          where: { id: stat.categoryId },
        })
        return {
          category,
          totalSales: stat._sum.amount || 0,
          totalMargin: stat._sum.margin || 0,
        }
      })
    )

    // 최근 거래 내역
    const recentTransactions = await prisma.salesRecord.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: {
        salesperson: true,
        category: true,
      },
    })

    return NextResponse.json({
      currentMonth: {
        totalSales: currentSales,
        totalMargin: currentMargin,
        totalMarginRate: currentSales > 0 ? (currentMargin / currentSales) * 100 : 0,
        count: currentMonthSales._count.id || 0,
      },
      lastMonth: {
        totalSales: lastSales,
        totalMargin: lastMargin,
      },
      growth: {
        salesGrowth,
        marginGrowth,
      },
      salespersonStats: salespersonData,
      categoryStats: categoryData,
      recentTransactions,
    })
  } catch (error) {
    console.error('Error generating overview:', error)
    return NextResponse.json(
      { error: '오버뷰 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
