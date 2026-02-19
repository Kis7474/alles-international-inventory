import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enforceStaffSalespersonOwnership, getScopedSalespersonId, requireRole } from '@/lib/auth'

function toInt(value: string | null): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

// GET /api/sales - 매입매출 목록 조회
export async function GET(request: NextRequest) {
  const { error, auth } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error || !auth) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const salespersonId = toInt(searchParams.get('salespersonId'))
    const categoryId = toInt(searchParams.get('categoryId'))
    const vendorId = toInt(searchParams.get('vendorId'))
    const productId = toInt(searchParams.get('productId'))
    const itemName = searchParams.get('itemName')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    interface WhereClause {
      type?: string
      salespersonId?: number
      categoryId?: number
      vendorId?: number
      productId?: number
      itemName?: {
        contains: string
        mode: 'insensitive'
      }
      date?: {
        gte?: Date
        lte?: Date
      }
    }

    const where: WhereClause = {}
    const scopedSalespersonId = getScopedSalespersonId(auth)

    if (type) where.type = type
    if (scopedSalespersonId) {
      where.salespersonId = scopedSalespersonId
    } else if (salespersonId) {
      where.salespersonId = salespersonId
    }
    if (categoryId) where.categoryId = categoryId
    if (vendorId) where.vendorId = vendorId
    if (productId) where.productId = productId

    if (itemName) {
      where.itemName = {
        contains: itemName,
        mode: 'insensitive',
      }
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const sales = await prisma.salesRecord.findMany({
      where,
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
        linkedPurchases: {
          select: {
            id: true,
            vendorId: true,
            vendor: { select: { name: true } },
            unitPrice: true,
            amount: true,
            costSource: true,
            quantity: true,
            date: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await prisma.salesRecord.count({ where })

    return NextResponse.json({
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (routeError) {
    console.error('Error fetching sales:', routeError)
    return NextResponse.json({ error: '매입매출 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST /api/sales - 매입매출 생성
export async function POST(request: NextRequest) {
  const { error, auth } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error || !auth) return error

  try {
    const body = await request.json()
    const {
      date,
      type,
      salespersonId,
      categoryId,
      productId,
      vendorId,
      itemName,
      customer,
      quantity,
      unitPrice,
      cost,
      notes,
      purchasePriceOverride,
    } = body

    const resolvedSalespersonId = auth.user.role === 'STAFF' ? auth.user.salespersonId : parseInt(salespersonId)
    if (!resolvedSalespersonId) {
      return NextResponse.json({ error: '담당자 정보가 필요합니다.' }, { status: 400 })
    }

    const ownershipResult = enforceStaffSalespersonOwnership(auth, resolvedSalespersonId)
    if (!ownershipResult.ok) return ownershipResult.error

    const amount = quantity * unitPrice

    let finalCost = 0
    let costSource = null

    if (type === 'SALES') {
      if (productId) {
        const { getProductCurrentCost } = await import('@/lib/product-cost')
        const costData = await getProductCurrentCost(parseInt(productId))

        if (costData.source === 'CURRENT') {
          costSource = 'PRODUCT_CURRENT'
          finalCost = costData.cost
        } else if (costData.source === 'DEFAULT') {
          costSource = 'PRODUCT_DEFAULT'
          finalCost = costData.cost
        } else {
          costSource = cost ? 'MANUAL' : 'PRODUCT_CURRENT'
          finalCost = cost ? parseFloat(cost) : 0
        }
      } else {
        costSource = 'MANUAL'
        finalCost = cost ? parseFloat(cost) : 0
      }
    }

    const totalCost = finalCost * quantity
    const margin = type === 'SALES' ? amount - totalCost : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.create({
      data: {
        date: new Date(date),
        type,
        salespersonId: resolvedSalespersonId,
        categoryId: parseInt(categoryId),
        productId: productId ? parseInt(productId) : null,
        vendorId: vendorId ? parseInt(vendorId) : null,
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: finalCost,
        margin,
        marginRate,
        costSource,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
      },
    })

    if (type === 'SALES' && productId) {
      const { createAutoPurchaseRecord } = await import('@/lib/purchase-auto')

      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) },
        include: {
          category: true,
          purchaseVendor: true,
        },
      })

      if (product && product.purchaseVendorId) {
        const purchasePrice = purchasePriceOverride ? parseFloat(purchasePriceOverride) : (product.defaultPurchasePrice || 0)

        if (purchasePrice > 0) {
          await createAutoPurchaseRecord({
            productId: product.id,
            vendorId: product.purchaseVendorId,
            salespersonId: resolvedSalespersonId,
            categoryId: parseInt(categoryId),
            quantity: parseFloat(quantity),
            unitPrice: purchasePrice,
            date: new Date(date),
            itemName: product.name,
            costSource: 'SALES_AUTO',
            linkedSalesId: salesRecord.id,
            notes: `매출 ${salesRecord.id}에서 자동생성`,
          })
        }
      }
    }

    return NextResponse.json(salesRecord, { status: 201 })
  } catch (routeError) {
    console.error('Error creating sales record:', routeError)
    return NextResponse.json({ error: '매입매출 등록 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PUT /api/sales - 매입매출 수정
export async function PUT(request: NextRequest) {
  const { error, auth } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error || !auth) return error

  try {
    const body = await request.json()
    const { id, date, type, salespersonId, categoryId, productId, vendorId, itemName, customer, quantity, unitPrice, cost, notes } = body

    const recordId = parseInt(id)

    if (auth.user.role === 'STAFF') {
      const existing = await prisma.salesRecord.findUnique({ where: { id: recordId }, select: { salespersonId: true } })
      if (!existing) {
        return NextResponse.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 })
      }
      const ownershipResult = enforceStaffSalespersonOwnership(auth, existing.salespersonId)
      if (!ownershipResult.ok) return ownershipResult.error
    }

    const resolvedSalespersonId = auth.user.role === 'STAFF' ? auth.user.salespersonId : parseInt(salespersonId)
    if (!resolvedSalespersonId) {
      return NextResponse.json({ error: '담당자 정보가 필요합니다.' }, { status: 400 })
    }

    const amount = quantity * unitPrice

    let finalCost = 0
    let costSource = null

    if (type === 'SALES') {
      if (productId) {
        const { getProductCurrentCost } = await import('@/lib/product-cost')
        const costData = await getProductCurrentCost(parseInt(productId))

        if (costData.source === 'CURRENT') {
          costSource = 'PRODUCT_CURRENT'
          finalCost = costData.cost
        } else if (costData.source === 'DEFAULT') {
          costSource = 'PRODUCT_DEFAULT'
          finalCost = costData.cost
        } else {
          costSource = cost ? 'MANUAL' : 'PRODUCT_CURRENT'
          finalCost = cost ? parseFloat(cost) : 0
        }
      } else {
        costSource = 'MANUAL'
        finalCost = cost ? parseFloat(cost) : 0
      }
    }

    const totalCost = finalCost * quantity
    const margin = type === 'SALES' ? amount - totalCost : 0
    const marginRate = type === 'SALES' && amount > 0 ? (margin / amount) * 100 : 0

    const salesRecord = await prisma.salesRecord.update({
      where: { id: recordId },
      data: {
        date: new Date(date),
        type,
        salespersonId: resolvedSalespersonId,
        categoryId: parseInt(categoryId),
        productId: productId ? parseInt(productId) : null,
        vendorId: vendorId ? parseInt(vendorId) : null,
        itemName,
        customer: customer || null,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        amount,
        cost: finalCost,
        margin,
        marginRate,
        costSource,
        notes: notes || null,
      },
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
      },
    })

    return NextResponse.json(salesRecord)
  } catch (routeError) {
    console.error('Error updating sales record:', routeError)
    return NextResponse.json({ error: '매입매출 수정 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/sales - 매입매출 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  const { error, auth } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error || !auth) return error

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    if (body && body.ids && Array.isArray(body.ids)) {
      const ids = body.ids.map((value: string | number) => parseInt(value.toString()))
      const scopedSalespersonId = getScopedSalespersonId(auth)

      await prisma.salesRecord.deleteMany({
        where: {
          linkedSalesId: { in: ids },
          costSource: 'SALES_AUTO',
          ...(scopedSalespersonId ? { salespersonId: scopedSalespersonId } : {}),
        },
      })

      const deleted = await prisma.salesRecord.deleteMany({
        where: {
          id: { in: ids },
          ...(scopedSalespersonId ? { salespersonId: scopedSalespersonId } : {}),
        },
      })

      return NextResponse.json({ success: true, count: deleted.count })
    }

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 })
    }

    const parsedId = parseInt(id)

    if (auth.user.role === 'STAFF') {
      const existing = await prisma.salesRecord.findUnique({ where: { id: parsedId }, select: { salespersonId: true } })
      if (!existing) return NextResponse.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 })
      const ownershipResult = enforceStaffSalespersonOwnership(auth, existing.salespersonId)
      if (!ownershipResult.ok) return ownershipResult.error
    }

    await prisma.salesRecord.deleteMany({
      where: {
        linkedSalesId: parsedId,
        costSource: 'SALES_AUTO',
      },
    })

    await prisma.salesRecord.delete({ where: { id: parsedId } })

    return NextResponse.json({ success: true })
  } catch (routeError) {
    console.error('Error deleting sales record:', routeError)
    return NextResponse.json({ error: '매입매출 삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
