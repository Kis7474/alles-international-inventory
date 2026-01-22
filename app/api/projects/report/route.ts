import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/report - 프로젝트 리포트 조회
export async function GET() {
  try {
    // 모든 프로젝트 조회
    const projects = await prisma.project.findMany({
      include: {
        items: true,
      },
    })
    
    // 상태별 통계
    const statusStats = {
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    }
    
    let totalCost = 0
    let totalSales = 0
    let totalMargin = 0
    
    projects.forEach((project) => {
      // 상태별 카운트
      if (project.status === 'IN_PROGRESS') {
        statusStats.IN_PROGRESS++
      } else if (project.status === 'COMPLETED') {
        statusStats.COMPLETED++
      } else if (project.status === 'CANCELLED') {
        statusStats.CANCELLED++
      }
      
      // 금액 합계 (취소된 프로젝트 제외)
      if (project.status !== 'CANCELLED') {
        totalCost += project.totalCost || 0
        totalSales += project.salesPrice || 0
        totalMargin += project.margin || 0
      }
    })
    
    // 평균 마진율 계산
    const averageMarginRate = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0
    
    return NextResponse.json({
      totalProjects: projects.length,
      statusStats,
      totalCost,
      totalSales,
      totalMargin,
      averageMarginRate: parseFloat(averageMarginRate.toFixed(2)),
      projects: projects.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        totalCost: p.totalCost,
        salesPrice: p.salesPrice,
        margin: p.margin,
        marginRate: p.marginRate,
      })),
    })
  } catch (error) {
    console.error('Error fetching project report:', error)
    return NextResponse.json({ error: 'Failed to fetch project report' }, { status: 500 })
  }
}
