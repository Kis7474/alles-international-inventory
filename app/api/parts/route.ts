import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/parts - 부품 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const searchName = searchParams.get('searchName')
    
    interface WhereClause {
      categoryId?: number
      OR?: Array<{
        name?: { contains: string }
        code?: { contains: string }
      }>
    }
    
    const where: WhereClause = {}
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (searchName) {
      where.OR = [
        { name: { contains: searchName } },
        { code: { contains: searchName } },
      ]
    }
    
    const parts = await prisma.part.findMany({
      where,
      include: {
        category: true,
        purchaseVendor: true,
        salesVendor: true,
      },
      orderBy: { id: 'asc' },
    })
    
    return NextResponse.json(parts)
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json({ error: 'Failed to fetch parts' }, { status: 500 })
  }
}

// POST /api/parts - 부품 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      code,
      name,
      unit,
      categoryId,
      description,
      defaultPurchasePrice,
      purchaseVendorId,
      salesVendorId,
    } = body

    // Validation
    if (!name) {
      return NextResponse.json({ error: '부품명을 입력해주세요.' }, { status: 400 })
    }
    if (!purchaseVendorId) {
      return NextResponse.json({ error: '매입처를 선택해주세요.' }, { status: 400 })
    }

    const part = await prisma.part.create({
      data: {
        code,
        name,
        unit: unit || 'EA',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: parseInt(purchaseVendorId),
        salesVendorId: salesVendorId ? parseInt(salesVendorId) : null,
      },
      include: {
        category: true,
        purchaseVendor: true,
        salesVendor: true,
      },
    })

    return NextResponse.json(part, { status: 201 })
  } catch (error) {
    console.error('Error creating part:', error)
    return NextResponse.json({ error: 'Failed to create part' }, { status: 500 })
  }
}

// PUT /api/parts - 부품 수정
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      code,
      name,
      unit,
      categoryId,
      description,
      defaultPurchasePrice,
      purchaseVendorId,
      salesVendorId,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const part = await prisma.part.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        unit,
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: parseInt(purchaseVendorId),
        salesVendorId: salesVendorId ? parseInt(salesVendorId) : null,
      },
      include: {
        category: true,
        purchaseVendor: true,
        salesVendor: true,
      },
    })

    return NextResponse.json(part)
  } catch (error) {
    console.error('Error updating part:', error)
    return NextResponse.json({ error: 'Failed to update part' }, { status: 500 })
  }
}

// DELETE /api/parts - 부품 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.part.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting part:', error)
    return NextResponse.json({ error: 'Failed to delete part' }, { status: 500 })
  }
}
