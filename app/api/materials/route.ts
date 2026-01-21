import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/materials - 재료 목록 조회
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
    
    const materials = await prisma.material.findMany({
      where,
      include: {
        category: true,
        purchaseVendor: true,
        salesVendor: true,
      },
      orderBy: { id: 'asc' },
    })
    
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

// POST /api/materials - 재료 생성
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
      return NextResponse.json({ error: '재료명을 입력해주세요.' }, { status: 400 })
    }
    if (!purchaseVendorId) {
      return NextResponse.json({ error: '매입처를 선택해주세요.' }, { status: 400 })
    }

    const material = await prisma.material.create({
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

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 })
  }
}

// PUT /api/materials - 재료 수정
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

    const material = await prisma.material.update({
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

    return NextResponse.json(material)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
  }
}

// DELETE /api/materials - 재료 삭제
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    await prisma.material.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}
