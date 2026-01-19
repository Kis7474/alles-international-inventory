import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateImportCost } from '@/lib/utils'

// GET /api/import-export - 수입/수출 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // IMPORT or EXPORT
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const where: any = {}
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

    // 창고 입고 처리 (storageType === 'WAREHOUSE')
    if (storageType === 'WAREHOUSE' && type === 'IMPORT' && unitCost) {
      await prisma.inventoryLot.create({
        data: {
          productId: parseInt(productId),
          vendorId: parseInt(vendorId),
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          lotCode: `IE-${record.id}`,
          receivedDate: new Date(date),
          quantityReceived: parseFloat(quantity),
          quantityRemaining: parseFloat(quantity),
          goodsAmount: goodsAmount ? parseFloat(goodsAmount) * parseFloat(exchangeRate) : 0,
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : 0,
          domesticFreight: shippingCost ? parseFloat(shippingCost) : 0,
          otherCost: otherCost ? parseFloat(otherCost) : 0,
          unitCost,
        },
      })
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

// DELETE /api/import-export - 수입/수출 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

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
