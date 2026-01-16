import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 창고료 목록 조회
export async function GET() {
  try {
    const expenses = await prisma.storageExpense.findMany({
      orderBy: { period: 'desc' },
    })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching storage expenses:', error)
    return NextResponse.json(
      { error: '창고료 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 창고료 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { period, dateFrom, dateTo, amount, memo } = body

    // 유효성 검사
    if (!period || !dateFrom || !dateTo || amount === undefined) {
      return NextResponse.json(
        { error: '기간, 시작일, 종료일, 금액은 필수 항목입니다.' },
        { status: 400 }
      )
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: '금액은 음수가 될 수 없습니다.' },
        { status: 400 }
      )
    }

    // 중복 기간 확인
    const existing = await prisma.storageExpense.findFirst({
      where: { period },
    })

    if (existing) {
      return NextResponse.json(
        { error: '해당 기간의 창고료가 이미 등록되어 있습니다.' },
        { status: 409 }
      )
    }

    const expense = await prisma.storageExpense.create({
      data: {
        period,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        amount,
        memo: memo || null,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating storage expense:', error)
    return NextResponse.json(
      { error: '창고료 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 창고료 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, period, dateFrom, dateTo, amount, memo } = body

    if (!id) {
      return NextResponse.json(
        { error: '창고료 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 기간 중복 확인 (자신 제외)
    if (period) {
      const existing = await prisma.storageExpense.findFirst({
        where: {
          period,
          NOT: { id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: '해당 기간의 창고료가 이미 등록되어 있습니다.' },
          { status: 409 }
        )
      }
    }

    const expense = await prisma.storageExpense.update({
      where: { id },
      data: {
        period,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        amount,
        memo,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating storage expense:', error)
    return NextResponse.json(
      { error: '창고료 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 창고료 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '창고료 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await prisma.storageExpense.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting storage expense:', error)
    return NextResponse.json(
      { error: '창고료 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
