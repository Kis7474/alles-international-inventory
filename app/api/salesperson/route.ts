import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const salespersons = await prisma.salesperson.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(salespersons, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching salespersons:', error)
    return NextResponse.json(
      { error: '판매 담당자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, commissionRate } = body

    const salesperson = await prisma.salesperson.create({
      data: {
        name,
        commissionRate,
      },
    })

    return NextResponse.json(salesperson, { status: 201 })
  } catch (error) {
    console.error('Error creating salesperson:', error)
    return NextResponse.json(
      { error: '담당자 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, commissionRate } = body

    const salesperson = await prisma.salesperson.update({
      where: { id: parseInt(id) },
      data: {
        name,
        commissionRate,
      },
    })

    return NextResponse.json(salesperson)
  } catch (error) {
    console.error('Error updating salesperson:', error)
    return NextResponse.json(
      { error: '담당자 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

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

    await prisma.salesperson.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting salesperson:', error)
    return NextResponse.json(
      { error: '담당자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
