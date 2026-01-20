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
        name?: { contains: string; mode: 'insensitive' }
        code?: { contains: string; mode: 'insensitive' }
      }>
    }
    
    const where: WhereClause = {}
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (searchName) {
      where.OR = [
        { name: { contains: searchName, mode: 'insensitive' as const } },
        { code: { contains: searchName, mode: 'insensitive' as const } },
      ]
    }
    
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { code: 'asc' },
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
    } = body
    
    const product = await prisma.product.create({
      data: {
        code,
        name,
        unit,
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
      },
      include: {
        category: true,
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
    } = body
    
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        unit,
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
      },
      include: {
        category: true,
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
