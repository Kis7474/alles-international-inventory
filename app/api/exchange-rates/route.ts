import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/exchange-rates - 환율 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const date = searchParams.get('date')
    
    interface WhereClause {
      currency?: string
      date?: {
        lte: Date
      }
    }
    
    const where: WhereClause = {}
    if (currency) where.currency = currency
    if (date) {
      where.date = {
        lte: new Date(date),
      }
    }
    
    const rates = await prisma.exchangeRate.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    return NextResponse.json(
      { error: '환율 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/exchange-rates - 환율 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date, currency, rate, source } = body

    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        date: new Date(date),
        currency,
        rate: parseFloat(rate),
        source: source || null,
      },
    })

    return NextResponse.json(exchangeRate, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating exchange rate:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: '동일한 날짜와 통화의 환율이 이미 존재합니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '환율 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/exchange-rates - 환율 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, rate, source } = body

    const exchangeRate = await prisma.exchangeRate.update({
      where: { id: parseInt(id) },
      data: {
        rate: parseFloat(rate),
        source: source || null,
      },
    })

    return NextResponse.json(exchangeRate)
  } catch (error) {
    console.error('Error updating exchange rate:', error)
    return NextResponse.json(
      { error: '환율 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/exchange-rates - 환율 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await prisma.exchangeRate.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exchange rate:', error)
    return NextResponse.json(
      { error: '환율 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
