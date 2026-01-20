import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products - 통합 품목 목록 조회
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
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        purchaseVendor: true,
        salesVendors: {
          include: {
            vendor: true,
          },
        },
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    })
    
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/products - 품목 생성
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
      defaultSalesPrice,
      purchaseVendorId,
      salesVendorIds,
    } = body
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: '품목명은 필수입니다.' }, { status: 400 })
    }
    
    if (!purchaseVendorId) {
      return NextResponse.json({ error: '매입 거래처는 필수입니다.' }, { status: 400 })
    }
    
    const parsedPurchaseVendorId = parseInt(purchaseVendorId)
    if (isNaN(parsedPurchaseVendorId)) {
      return NextResponse.json({ error: '유효하지 않은 매입 거래처입니다.' }, { status: 400 })
    }
    
    // Validate salesVendorIds if provided
    let parsedSalesVendorIds: number[] | undefined
    if (salesVendorIds && Array.isArray(salesVendorIds) && salesVendorIds.length > 0) {
      parsedSalesVendorIds = salesVendorIds.map((id: string) => parseInt(id))
      if (parsedSalesVendorIds.some(id => isNaN(id))) {
        return NextResponse.json({ error: '유효하지 않은 매출 거래처가 포함되어 있습니다.' }, { status: 400 })
      }
    }
    
    const product = await prisma.product.create({
      data: {
        code: code || null,
        name,
        unit: unit || 'EA',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
        purchaseVendorId: parsedPurchaseVendorId,
        salesVendors: parsedSalesVendorIds ? {
          create: parsedSalesVendorIds.map((vendorId) => ({
            vendorId,
          })),
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
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT /api/products - 품목 수정
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
      defaultSalesPrice,
      purchaseVendorId,
      salesVendorIds,
    } = body
    
    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: '품목 ID가 필요합니다.' }, { status: 400 })
    }
    
    if (!name) {
      return NextResponse.json({ error: '품목명은 필수입니다.' }, { status: 400 })
    }
    
    if (!purchaseVendorId) {
      return NextResponse.json({ error: '매입 거래처는 필수입니다.' }, { status: 400 })
    }
    
    const parsedId = parseInt(id)
    const parsedPurchaseVendorId = parseInt(purchaseVendorId)
    
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '유효하지 않은 품목 ID입니다.' }, { status: 400 })
    }
    
    if (isNaN(parsedPurchaseVendorId)) {
      return NextResponse.json({ error: '유효하지 않은 매입 거래처입니다.' }, { status: 400 })
    }
    
    // Validate salesVendorIds if provided
    let parsedSalesVendorIds: number[] | undefined
    if (salesVendorIds && Array.isArray(salesVendorIds) && salesVendorIds.length > 0) {
      parsedSalesVendorIds = salesVendorIds.map((vendorId: string) => parseInt(vendorId))
      if (parsedSalesVendorIds.some(id => isNaN(id))) {
        return NextResponse.json({ error: '유효하지 않은 매출 거래처가 포함되어 있습니다.' }, { status: 400 })
      }
    }
    
    // First, delete existing sales vendor relationships
    await prisma.productSalesVendor.deleteMany({
      where: { productId: parsedId },
    })
    
    const product = await prisma.product.update({
      where: { id: parsedId },
      data: {
        code: code || null,
        name,
        unit: unit || 'EA',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
        purchaseVendorId: parsedPurchaseVendorId,
        salesVendors: parsedSalesVendorIds ? {
          create: parsedSalesVendorIds.map((vendorId) => ({
            vendorId,
          })),
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
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE /api/products - 품목 삭제 (단일 또는 다중)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      await prisma.product.deleteMany({
        where: {
          id: { in: body.ids.map((id: string | number) => parseInt(id.toString())) }
        }
      })
      return NextResponse.json({ success: true, count: body.ids.length })
    }

    // Single delete
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }
    
    await prisma.product.delete({
      where: { id: parseInt(id) },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
