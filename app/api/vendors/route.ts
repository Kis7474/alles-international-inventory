import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/vendors - 거래처 목록 조회
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: '거래처 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/vendors - 거래처 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contact, address, notes } = body

    const vendor = await prisma.vendor.create({
      data: {
        name,
        contact: contact || null,
        address: address || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error: any) {
    console.error('Error creating vendor:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 거래처명입니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '거래처 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/vendors - 거래처 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, contact, address, notes } = body

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        name,
        contact: contact || null,
        address: address || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(vendor)
  } catch (error: any) {
    console.error('Error updating vendor:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 거래처명입니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '거래처 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/vendors - 거래처 삭제
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

    // 판매 내역이 있는지 확인
    const salesCount = await prisma.salesRecord.count({
      where: { vendorId: parseInt(id) },
    })

    if (salesCount > 0) {
      return NextResponse.json(
        { error: '거래 내역이 있는 거래처는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    await prisma.vendor.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: '거래처 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
