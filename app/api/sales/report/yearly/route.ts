import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')

    if (!year) {
      return NextResponse.json(
        { error: '연도가 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 연도의 시작일과 종료일
    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31T23:59:59`)

    // 월별 매출/마진 추이
    const monthlyTrends = []
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(`${year}-${month.toString().padStart(2, '0')}-01`)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const monthSales = await prisma.salesRecord.aggregate({
        where: {
          date: {
            gte: monthStart,
            lt: monthEnd,
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

      monthlyTrends.push({
        month,
        monthName: `${year}-${month.toString().padStart(2, '0')}`,
        totalSales: monthSales._sum.amount || 0,
        totalMargin: monthSales._sum.margin || 0,
        count: monthSales._count.id || 0,
      })
    }

    // 담당자별 연간 실적
    const salespersonStats = await prisma.salesRecord.groupBy({
      by: ['salespersonId'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
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

    const salespersonData = await Promise.all(
      salespersonStats.map(async (stat) => {
        const salesperson = await prisma.salesperson.findUnique({
          where: { id: stat.salespersonId },
        })
        
        const totalAmount = stat._sum.amount || 0
        const totalMargin = stat._sum.margin || 0
        const avgMarginRate = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0
        const commission = salesperson?.code === 'IK' ? totalMargin * 0.15 : 0

        return {
          salesperson,
          totalSales: totalAmount,
          totalMargin,
          avgMarginRate,
          commission,
          count: stat._count.id,
        }
      })
    )

    // 카테고리별 연간 실적
    const categoryStats = await prisma.salesRecord.groupBy({
      by: ['categoryId'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
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

    const categoryData = await Promise.all(
      categoryStats.map(async (stat) => {
        let category = null
        if (stat.categoryId) {
          category = await prisma.productCategory.findUnique({
            where: { id: stat.categoryId },
          })
        }
        return {
          category: category || null,
          totalSales: stat._sum.amount || 0,
          totalMargin: stat._sum.margin || 0,
          count: stat._count.id,
        }
      })
    )

    // 전체 통계
    const yearSales = await prisma.salesRecord.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
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

    return NextResponse.json({
      year,
      summary: {
        totalSales: yearSales._sum.amount || 0,
        totalMargin: yearSales._sum.margin || 0,
        totalMarginRate:
          yearSales._sum.amount && yearSales._sum.amount > 0
            ? ((yearSales._sum.margin || 0) / yearSales._sum.amount) * 100
            : 0,
        totalCount: yearSales._count.id || 0,
      },
      monthlyTrends,
      salespersonStats: salespersonData,
      categoryStats: categoryData,
    })
  } catch (error) {
    console.error('Error generating yearly report:', error)
    return NextResponse.json(
      { error: '연도별 리포트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
