import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!year || !month) {
      return NextResponse.json(
        { error: '연도와 월이 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 월의 시작일과 종료일
    const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    // 해당 월의 모든 매출 데이터
    const sales = await prisma.salesRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
        type: 'SALES',
      },
      include: {
        salesperson: true,
        category: true,
      },
    })

    // 담당자별 집계
    const salespersonStats = await prisma.salesRecord.groupBy({
      by: ['salespersonId'],
      where: {
        date: {
          gte: startDate,
          lt: endDate,
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

    // 담당자 정보 추가
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

    // 카테고리별 집계
    const categoryStats = await prisma.salesRecord.groupBy({
      by: ['categoryId'],
      where: {
        date: {
          gte: startDate,
          lt: endDate,
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
    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0)
    const totalMargin = sales.reduce((sum, s) => sum + s.margin, 0)
    const totalMarginRate = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0

    return NextResponse.json({
      period: { year, month },
      summary: {
        totalSales,
        totalMargin,
        totalMarginRate,
        totalCount: sales.length,
      },
      salespersonStats: salespersonData,
      categoryStats: categoryData,
      sales,
    })
  } catch (error) {
    console.error('Error generating monthly report:', error)
    return NextResponse.json(
      { error: '월별 리포트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
