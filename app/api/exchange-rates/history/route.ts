import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    
    if (!currency) {
      return NextResponse.json({ error: '통화를 선택해주세요.' }, { status: 400 })
    }
    
    interface WhereClause {
      currency: string
      date?: {
        gte?: Date
        lte?: Date
      }
    }
    
    const where: WhereClause = { currency }
    
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        where.date.lte = endDateTime
      }
    }
    
    const [rates, total] = await Promise.all([
      prisma.exchangeRate.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.exchangeRate.count({ where }),
    ])
    
    return NextResponse.json({ rates, total, page, pageSize })
  } catch (error) {
    console.error('Error fetching exchange rate history:', error)
    return NextResponse.json({ error: '환율 이력 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
