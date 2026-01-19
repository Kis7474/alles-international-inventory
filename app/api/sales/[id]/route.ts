import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const salesRecord = await prisma.salesRecord.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        salesperson: true,
        category: true,
      },
    })

    if (!salesRecord) {
      return NextResponse.json(
        { error: '매입매출 기록을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(salesRecord)
  } catch (error) {
    console.error('Error fetching sales record:', error)
    return NextResponse.json(
      { error: '매입매출 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
