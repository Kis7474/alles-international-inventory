import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/materials - 재료 목록 조회 (Product 테이블 사용, type=MATERIAL)
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
      type: 'MATERIAL'
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
    
    const materials = await prisma.product.findMany({
      where,
      include: {
        category: true,
        purchaseVendor: true,
        vendorPrices: {
          include: {
            vendor: true,
          },
          orderBy: { effectiveDate: 'desc' },
        },
      },
      orderBy: { id: 'asc' },
    })
    
    // Transform to match Material interface for backward compatibility
    const transformedMaterials = materials.map(product => {
      // Get the latest sales vendor price
      const latestSalesPrice = product.vendorPrices.find(vp => vp.salesPrice !== null && vp.salesPrice !== undefined)
      return {
        ...product,
        salesVendor: latestSalesPrice?.vendor || null,
        salesVendorId: latestSalesPrice?.vendorId || null,
      }
    })
    
    return NextResponse.json(transformedMaterials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 })
  }
}

// POST /api/materials - 재료 생성 (Product 테이블 사용, type=MATERIAL)
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

    const material = await prisma.product.create({
      data: {
        code,
        name,
        unit: unit || 'KG',
        type: 'MATERIAL',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: purchaseVendorId ? parseInt(purchaseVendorId) : null,
      },
      include: {
        category: true,
        purchaseVendor: true,
        vendorPrices: {
          include: {
            vendor: true,
          },
        },
      },
    })

    // Create sales vendor price if provided
    if (salesVendorId) {
      await prisma.vendorProductPrice.create({
        data: {
          vendorId: parseInt(salesVendorId),
          productId: material.id,
          salesPrice: 0, // Default to 0, can be updated later
          effectiveDate: new Date(),
        },
      })
    }

    // Transform response for backward compatibility
    const latestSalesPrice = material.vendorPrices.find(vp => vp.salesPrice !== null && vp.salesPrice !== undefined)
    const response = {
      ...material,
      salesVendor: latestSalesPrice?.vendor || null,
      salesVendorId: latestSalesPrice?.vendorId || null,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 })
  }
}

// PUT /api/materials - 재료 수정 (Product 테이블 사용)
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

    // Delete existing sales vendor relationships (VendorProductPrice)
    await prisma.vendorProductPrice.deleteMany({
      where: { 
        productId: parseInt(id),
        salesPrice: { not: null }
      },
    })

    const material = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        unit,
        type: 'MATERIAL',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        purchaseVendorId: purchaseVendorId ? parseInt(purchaseVendorId) : null,
      },
      include: {
        category: true,
        purchaseVendor: true,
        vendorPrices: {
          include: {
            vendor: true,
          },
        },
      },
    })

    // Create sales vendor price if provided
    if (salesVendorId) {
      await prisma.vendorProductPrice.create({
        data: {
          vendorId: parseInt(salesVendorId),
          productId: material.id,
          salesPrice: 0, // Default to 0, can be updated later
          effectiveDate: new Date(),
        },
      })
    }

    // Transform response for backward compatibility
    const latestSalesPrice = material.vendorPrices.find(vp => vp.salesPrice !== null && vp.salesPrice !== undefined)
    const response = {
      ...material,
      salesVendor: latestSalesPrice?.vendor || null,
      salesVendorId: latestSalesPrice?.vendorId || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 })
  }
}

// DELETE /api/materials - 재료 삭제 (Product 테이블 사용)
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
          type: 'MATERIAL',
        }
      })
      return NextResponse.json({ success: true, count: validIds.length })
    }

    // Single delete
    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    // Verify the product is a MATERIAL type before deletion
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      select: { type: true }
    })

    if (!product) {
      return NextResponse.json({ error: '품목을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (product.type !== 'MATERIAL') {
      return NextResponse.json({ error: '재료 타입 품목만 삭제할 수 있습니다.' }, { status: 400 })
    }

    await prisma.product.delete({
      where: { 
        id: parseInt(id),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 })
  }
}
