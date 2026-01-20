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
    const { 
      code, 
      name, 
      type, 
      contactPerson, 
      phone, 
      email, 
      address, 
      country, 
      currency, 
      memo,
      // 하위 호환성
      contact,
      notes
    } = body

    const vendor = await prisma.vendor.create({
      data: {
        code: code || `V${Date.now()}`, // 자동 생성
        name,
        type: type || 'DOMESTIC',
        contactPerson: contactPerson || contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        country: country || null,
        currency: currency || null,
        memo: memo || notes || null,
      },
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating vendor:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 거래처명 또는 코드입니다.' },
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
    const { 
      id, 
      code,
      name, 
      type,
      contactPerson,
      phone,
      email,
      address,
      country,
      currency,
      memo,
      // 하위 호환성
      contact,
      notes
    } = body

    const vendor = await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        code: code || undefined,
        name,
        type: type || 'DOMESTIC',
        contactPerson: contactPerson || contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        country: country || null,
        currency: currency || null,
        memo: memo || notes || null,
      },
    })

    return NextResponse.json(vendor)
  } catch (error: unknown) {
    console.error('Error updating vendor:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: '이미 존재하는 거래처명 또는 코드입니다.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: '거래처 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/vendors - 거래처 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.map((id: string | number) => parseInt(id.toString()))
      
      // 판매 내역이 있는지 확인
      const salesCount = await prisma.salesRecord.count({
        where: { vendorId: { in: ids } },
      })

      if (salesCount > 0) {
        return NextResponse.json(
          { error: '거래 내역이 있는 거래처는 삭제할 수 없습니다.' },
          { status: 400 }
        )
      }

      await prisma.vendor.deleteMany({
        where: { id: { in: ids } },
      })

      return NextResponse.json({ success: true, count: body.ids.length })
    }

    // Single delete
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
