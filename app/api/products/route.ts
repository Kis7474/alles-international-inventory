import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateProductCode } from '@/lib/code-generator'

// GET /api/products - 통합 품목 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const searchName = searchParams.get('searchName')
    const salesVendorId = searchParams.get('salesVendorId')
    const includeCostInfo = searchParams.get('includeCostInfo') === 'true'
    const type = searchParams.get('type') // 품목 타입 필터 추가
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (searchName) {
      where.OR = [
        { name: { contains: searchName, mode: 'insensitive' } },
        { code: { contains: searchName, mode: 'insensitive' } },
      ]
    }
    
    // 매입거래처 필터 추가
    const purchaseVendorId = searchParams.get('purchaseVendorId')
    if (purchaseVendorId) {
      where.purchaseVendorId = parseInt(purchaseVendorId)
    }
    
    if (salesVendorId) {
      // 해당 거래처에 판매하는 품목만 조회 (VendorProductPrice 사용)
      where.vendorPrices = {
        some: {
          vendorId: parseInt(salesVendorId),
          salesPrice: { not: null },
        },
      }
    }
    if (type) {
      // 콤마로 구분된 타입들을 배열로 처리
      const types = type.split(',').map(t => t.trim())
      if (types.length === 1) {
        where.type = types[0]
      } else {
        where.type = { in: types }
      }
    }
    
    const products = await prisma.product.findMany({
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
        priceHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    })
    
    // Phase 5: Include cost information using currentCost from Product (more accurate than getProductCostWithStorage)
    // getProductCostWithStorage uses estimated storage rate, while currentCost uses actual allocated warehouse fees
    if (includeCostInfo) {
      const productsWithCostInfo = products.map((product) => {
        return {
          ...product,
          costInfo: {
            // Use currentCost which is calculated by updateProductCurrentCost() with actual allocated warehouse fees
            totalCostWithStorage: product.currentCost || 0,
            // For backward compatibility, provide empty structure
            baseAvgCost: 0,
            storageCostPerUnit: 0,
            storageCostRate: 0,
          },
        }
      })
      return NextResponse.json(productsWithCostInfo, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      })
    }
    
    return NextResponse.json(products, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
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
      type,
      categoryId,
      description,
      defaultPurchasePrice,
      defaultSalesPrice,
      purchaseVendorId,
      salesVendorIds,
      salesVendors,
      currentCost,
    } = body
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: '품목명은 필수입니다.' }, { status: 400 })
    }
    
    // purchaseVendorId는 이제 선택적
    let parsedPurchaseVendorId: number | null = null
    if (purchaseVendorId) {
      parsedPurchaseVendorId = parseInt(purchaseVendorId)
      if (isNaN(parsedPurchaseVendorId)) {
        return NextResponse.json({ error: '유효하지 않은 매입 거래처입니다.' }, { status: 400 })
      }
    }
    
    // Validate salesVendorIds if provided
    let parsedSalesVendorIds: number[] | undefined
    if (salesVendorIds && Array.isArray(salesVendorIds) && salesVendorIds.length > 0) {
      parsedSalesVendorIds = salesVendorIds.map((id: string) => parseInt(id))
      if (parsedSalesVendorIds.some(id => isNaN(id))) {
        return NextResponse.json({ error: '유효하지 않은 매출 거래처가 포함되어 있습니다.' }, { status: 400 })
      }
    }
    
    // code가 비어있으면 자동 생성
    const finalCode = code || await generateProductCode(prisma)

    const product = await prisma.product.create({
      data: {
        code: finalCode,
        name,
        unit: unit || 'EA',
        type: type || 'PRODUCT', // 기본값 PRODUCT
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
        currentCost: currentCost ? parseFloat(currentCost) : null,
        purchaseVendorId: parsedPurchaseVendorId,
      },
      include: {
        category: true,
        purchaseVendor: true,
      },
    })
    
    // salesVendors 배열로 거래처별 가격 저장 (VendorProductPrice에 저장)
    if (salesVendors && Array.isArray(salesVendors) && salesVendors.length > 0) {
      await prisma.vendorProductPrice.createMany({
        data: salesVendors.map((sv: { vendorId: number; salesPrice: number }) => ({
          vendorId: sv.vendorId,
          productId: product.id,
          salesPrice: sv.salesPrice,
          effectiveDate: new Date(),
        })),
      })
    }
    
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
      type,
      categoryId,
      description,
      defaultPurchasePrice,
      defaultSalesPrice,
      purchaseVendorId,
      salesVendorIds,
      salesVendors,
      currentCost,
    } = body
    
    // Validate required fields
    if (!id) {
      return NextResponse.json({ error: '품목 ID가 필요합니다.' }, { status: 400 })
    }
    
    if (!name) {
      return NextResponse.json({ error: '품목명은 필수입니다.' }, { status: 400 })
    }
    
    const parsedId = parseInt(id)
    
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: '유효하지 않은 품목 ID입니다.' }, { status: 400 })
    }
    
    // purchaseVendorId는 이제 선택적
    let parsedPurchaseVendorId: number | null = null
    if (purchaseVendorId) {
      parsedPurchaseVendorId = parseInt(purchaseVendorId)
      if (isNaN(parsedPurchaseVendorId)) {
        return NextResponse.json({ error: '유효하지 않은 매입 거래처입니다.' }, { status: 400 })
      }
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
    // (removed as we no longer use ProductSalesVendor)
    
    const product = await prisma.product.update({
      where: { id: parsedId },
      data: {
        code: code || null,
        name,
        unit: unit || 'EA',
        type: type || 'PRODUCT',
        categoryId: categoryId ? parseInt(categoryId) : null,
        description,
        defaultPurchasePrice: defaultPurchasePrice ? parseFloat(defaultPurchasePrice) : null,
        defaultSalesPrice: defaultSalesPrice ? parseFloat(defaultSalesPrice) : null,
        currentCost: currentCost ? parseFloat(currentCost) : null,
        purchaseVendorId: parsedPurchaseVendorId,
      },
      include: {
        category: true,
        purchaseVendor: true,
      },
    })
    
    // salesVendors 배열로 거래처별 가격 저장 (VendorProductPrice 업데이트)
    if (salesVendors && Array.isArray(salesVendors)) {
      // 기존 VendorProductPrice에서 해당 품목의 매출가 삭제 후 재생성
      await prisma.vendorProductPrice.deleteMany({
        where: { 
          productId: parsedId,
          salesPrice: { not: null }  // 매출가가 있는 것만
        }
      })
      
      // 새로운 매출거래처별 가격 생성
      if (salesVendors.length > 0) {
        await prisma.vendorProductPrice.createMany({
          data: salesVendors.map((sv: { vendorId: number; salesPrice: number }) => ({
            vendorId: sv.vendorId,
            productId: parsedId,
            salesPrice: sv.salesPrice,
            effectiveDate: new Date(),
          })),
        })
      }
    }
    
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
