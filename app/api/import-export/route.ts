import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateImportCost } from '@/lib/utils'

// GET /api/import-export - 수입/수출 목록 조회 또는 단일 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const type = searchParams.get('type') // IMPORT or EXPORT
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // 단일 레코드 조회
    if (id) {
      const record = await prisma.importExport.findUnique({
        where: { id: parseInt(id) },
        include: {
          product: true,
          vendor: true,
          salesperson: true,
          category: true,
        },
      })
      
      if (!record) {
        return NextResponse.json(
          { error: '해당 데이터를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(record)
    }
    
    // 목록 조회
    interface WhereClause {
      type?: string
      date?: {
        gte: Date
        lte: Date
      }
    }
    
    const where: WhereClause = {}
    if (type) where.type = type
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    
    const records = await prisma.importExport.findMany({
      where,
      include: {
        product: true,
        vendor: true,
        salesperson: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching import/export records:', error)
    return NextResponse.json(
      { error: '수입/수출 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/import-export - 수입/수출 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      type,
      productId,
      vendorId,
      salespersonId,
      categoryId,
      quantity,
      currency,
      exchangeRate,
      foreignAmount,
      goodsAmount,
      dutyAmount,
      shippingCost,
      otherCost,
      storageType,
      vatIncluded,
      memo,
    } = body

    // 원화 환산 금액
    const krwAmount = foreignAmount * exchangeRate

    // 수입 원가 계산 (수입인 경우)
    let totalCost = null
    let unitCost = null
    
    if (type === 'IMPORT' && goodsAmount) {
      const costCalc = calculateImportCost({
        goodsAmount: parseFloat(goodsAmount),
        exchangeRate: parseFloat(exchangeRate),
        dutyAmount: parseFloat(dutyAmount || 0),
        shippingCost: parseFloat(shippingCost || 0),
        otherCost: parseFloat(otherCost || 0),
        quantity: parseFloat(quantity),
      })
      totalCost = costCalc.totalCost
      unitCost = costCalc.unitCost
    }

    // 부가세 계산
    let supplyAmount = null
    let vatAmount = null
    let totalAmount = null
    
    if (vatIncluded !== undefined) {
      const amount = krwAmount
      if (vatIncluded) {
        supplyAmount = Math.round(amount / 1.1)
        vatAmount = amount - supplyAmount
      } else {
        supplyAmount = amount
        vatAmount = Math.round(amount * 0.1)
      }
      totalAmount = supplyAmount + vatAmount
    }

    const record = await prisma.importExport.create({
      data: {
        date: new Date(date),
        type,
        productId: parseInt(productId),
        vendorId: parseInt(vendorId),
        salespersonId: salespersonId ? parseInt(salespersonId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        quantity: parseFloat(quantity),
        currency,
        exchangeRate: parseFloat(exchangeRate),
        foreignAmount: parseFloat(foreignAmount),
        krwAmount,
        goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
        dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        otherCost: otherCost ? parseFloat(otherCost) : null,
        totalCost,
        unitCost,
        storageType: storageType || null,
        vatIncluded: vatIncluded || false,
        supplyAmount,
        vatAmount,
        totalAmount,
        memo: memo || null,
      },
      include: {
        product: true,
        vendor: true,
        salesperson: true,
        category: true,
      },
    })

    // ★★★ 창고 또는 사무실 보관인 경우 자동 입고 처리 ★★★
    if ((storageType === 'WAREHOUSE' || storageType === 'OFFICE') && type === 'IMPORT') {
      const inventoryLot = await prisma.inventoryLot.create({
        data: {
          productId: parseInt(productId),
          vendorId: parseInt(vendorId),
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          lotCode: `IE-${record.id}-${Date.now().toString().slice(-4)}`,
          receivedDate: new Date(date),
          quantityReceived: parseFloat(quantity),
          quantityRemaining: parseFloat(quantity),
          goodsAmount: goodsAmount ? parseFloat(goodsAmount) * parseFloat(exchangeRate) : 0,
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : 0,
          domesticFreight: shippingCost ? parseFloat(shippingCost) : 0,
          otherCost: otherCost ? parseFloat(otherCost) : 0,
          unitCost: unitCost || 0,
          storageLocation: storageType, // 'WAREHOUSE' 또는 'OFFICE'
          importExportId: record.id,
        },
      })
      
      console.log('Auto inventory created:', inventoryLot.id)
    }

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating import/export record:', error)
    return NextResponse.json(
      { error: '수입/수출 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/import-export - 수입/수출 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      date,
      type,
      productId,
      vendorId,
      salespersonId,
      categoryId,
      quantity,
      currency,
      exchangeRate,
      foreignAmount,
      goodsAmount,
      dutyAmount,
      shippingCost,
      otherCost,
      storageType,
      vatIncluded,
      memo,
    } = body

    const krwAmount = foreignAmount * exchangeRate

    let totalCost = null
    let unitCost = null
    
    if (type === 'IMPORT' && goodsAmount) {
      const costCalc = calculateImportCost({
        goodsAmount: parseFloat(goodsAmount),
        exchangeRate: parseFloat(exchangeRate),
        dutyAmount: parseFloat(dutyAmount || 0),
        shippingCost: parseFloat(shippingCost || 0),
        otherCost: parseFloat(otherCost || 0),
        quantity: parseFloat(quantity),
      })
      totalCost = costCalc.totalCost
      unitCost = costCalc.unitCost
    }

    let supplyAmount = null
    let vatAmount = null
    let totalAmount = null
    
    if (vatIncluded !== undefined) {
      const amount = krwAmount
      if (vatIncluded) {
        supplyAmount = Math.round(amount / 1.1)
        vatAmount = amount - supplyAmount
      } else {
        supplyAmount = amount
        vatAmount = Math.round(amount * 0.1)
      }
      totalAmount = supplyAmount + vatAmount
    }

    const record = await prisma.importExport.update({
      where: { id: parseInt(id) },
      data: {
        date: new Date(date),
        type,
        productId: parseInt(productId),
        vendorId: parseInt(vendorId),
        salespersonId: salespersonId ? parseInt(salespersonId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        quantity: parseFloat(quantity),
        currency,
        exchangeRate: parseFloat(exchangeRate),
        foreignAmount: parseFloat(foreignAmount),
        krwAmount,
        goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
        dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
        shippingCost: shippingCost ? parseFloat(shippingCost) : null,
        otherCost: otherCost ? parseFloat(otherCost) : null,
        totalCost,
        unitCost,
        storageType: storageType || null,
        vatIncluded: vatIncluded || false,
        supplyAmount,
        vatAmount,
        totalAmount,
        memo: memo || null,
      },
      include: {
        product: true,
        vendor: true,
        salesperson: true,
        category: true,
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating import/export record:', error)
    return NextResponse.json(
      { error: '수입/수출 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/import-export - 수입/수출 삭제 (단일 또는 다중)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      await prisma.importExport.deleteMany({
        where: {
          id: { in: body.ids.map((id: string | number) => parseInt(id.toString())) }
        }
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

    await prisma.importExport.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting import/export record:', error)
    return NextResponse.json(
      { error: '수입/수출 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
