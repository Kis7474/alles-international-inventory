import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/parts - 부품 목록 조회 (Product 테이블 사용, type=PART)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const searchName = searchParams.get('searchName')
    
    interface WhereClause {
      type: string
      categoryId?: number
      OR?: Array<{
        name?: { contains: string }
        code?: { contains: string }
      }>
    }
    
    const where: WhereClause = {
      type: 'PART'
    }
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (searchName) {
      where.OR = [
        { name: { contains: searchName } },
        { code: { contains: searchName } },
      ]
    }
    
    const parts = await prisma.product.findMany({
      where,
      include: {
        category: true,
        purchaseVendor: true,
        salesVendors: {
          include: {
            vendor: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    })
    
    // Transform to match Part interface for backward compatibility
    const transformedParts = parts.map(product => ({
      ...product,
      salesVendor: product.salesVendors.length > 0 ? product.salesVendors[0].vendor : null,
      salesVendorId: product.salesVendors.length > 0 ? product.salesVendors[0].vendorId : null,
    }))
    
    return NextResponse.json(transformedParts)
  } catch (error) {
    console.error('Error fetching parts:', error)
    return NextResponse.json({ error: 'Failed to fetch parts' }, { status: 500 })
  }
}

// POST /api/parts - 부품 생성 (Product 테이블 사용, type=PART)
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

    const part = await prisma.product.create({
      data: {
        code,
        name,
        unit: unit || 'EA',
        type: 'PART',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: purchaseVendorId ? parseInt(purchaseVendorId) : null,
        salesVendors: salesVendorId ? {
          create: {
            vendorId: parseInt(salesVendorId),
          },
        } : undefined,
      },
      include: {
        category: true,
        purchaseVendor: true,
        salesVendors: {
          include: {
            vendor: true,
          },
        },
      },
    })

    // Transform response for backward compatibility
    const response = {
      ...part,
      salesVendor: part.salesVendors.length > 0 ? part.salesVendors[0].vendor : null,
      salesVendorId: part.salesVendors.length > 0 ? part.salesVendors[0].vendorId : null,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating part:', error)
    return NextResponse.json({ error: 'Failed to create part' }, { status: 500 })
  }
}

// PUT /api/parts - 부품 수정 (Product 테이블 사용)
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

    // Delete existing sales vendor relationships
    await prisma.productSalesVendor.deleteMany({
      where: { productId: parseInt(id) },
    })

    const part = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        unit,
        type: 'PART',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: purchaseVendorId ? parseInt(purchaseVendorId) : null,
        salesVendors: salesVendorId ? {
          create: {
            vendorId: parseInt(salesVendorId),
          },
        } : undefined,
      },
      include: {
        category: true,
        purchaseVendor: true,
        salesVendors: {
          include: {
            vendor: true,
          },
        },
      },
    })

    // Transform response for backward compatibility
    const response = {
      ...part,
      salesVendor: part.salesVendors.length > 0 ? part.salesVendors[0].vendor : null,
      salesVendorId: part.salesVendors.length > 0 ? part.salesVendors[0].vendorId : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating part:', error)
    return NextResponse.json({ error: 'Failed to update part' }, { status: 500 })
  }
}

// DELETE /api/parts - 부품 삭제 (Product 테이블 사용)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      // Validate all IDs are valid numbers
      const validIds = body.ids
        .map((id: string | number) => parseInt(id.toString()))
        .filter((id: number) => !isNaN(id))
      
      if (validIds.length !== body.ids.length) {
        return NextResponse.json({ error: '유효하지 않은 ID가 포함되어 있습니다.' }, { status: 400 })
      }

      await prisma.product.deleteMany({
        where: {
          id: { in: validIds },
          type: 'PART',
        }
      })
      return NextResponse.json({ success: true, count: validIds.length })
    }

    // Single delete
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // Verify the product is a PART type before deletion
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: { type: true }
    })

    if (!product) {
      return NextResponse.json({ error: '품목을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (product.type !== 'PART') {
      return NextResponse.json({ error: '부품 타입 품목만 삭제할 수 있습니다.' }, { status: 400 })
    }

    await prisma.product.delete({
      where: { 
        id: parseInt(id),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting part:', error)
    return NextResponse.json({ error: 'Failed to delete part' }, { status: 500 })
  }
}
