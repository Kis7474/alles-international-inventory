import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const salespersons = await prisma.salesperson.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(salespersons)
  } catch (error) {
    console.error('Error fetching salespersons:', error)
    return NextResponse.json(
      { error: '판매 담당자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
