import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/services - 서비스 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchName = searchParams.get('searchName')
    
    interface WhereClause {
      OR?: Array<{
        name?: { contains: string }
        code?: { contains: string }
      }>
    }
    
    const where: WhereClause = {}
    
    if (searchName) {
      where.OR = [
        { name: { contains: searchName } },
        { code: { contains: searchName } },
      ]
    }
    
    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        salesVendor: true,
      },
      orderBy: { id: 'asc' },
    })
    
    return NextResponse.json(services)
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

// POST /api/services - 서비스 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      name,
      description,
      serviceHours,
      salesVendorId,
      categoryId,
    } = body

    // Validation
    if (!name) {
      return NextResponse.json({ error: '서비스명을 입력해주세요.' }, { status: 400 })
    }

    const service = await prisma.service.create({
      data: {
        code,
        name,
        description,
        serviceHours: serviceHours ? parseFloat(serviceHours) : null,
        salesVendorId: salesVendorId ? parseInt(salesVendorId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
      include: {
        category: true,
        salesVendor: true,
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}

// PUT /api/services - 서비스 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      code,
      name,
      description,
      serviceHours,
      salesVendorId,
      categoryId,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const service = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        description,
        serviceHours: serviceHours ? parseFloat(serviceHours) : null,
        salesVendorId: salesVendorId ? parseInt(salesVendorId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
      },
      include: {
        category: true,
        salesVendor: true,
      },
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

// DELETE /api/services - 서비스 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.service.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
