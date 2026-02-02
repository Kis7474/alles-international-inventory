import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateImportCost, distributeCostsAcrossItems } from '@/lib/utils'

interface ItemInput {
  productId: string
  quantity: string
  unitPrice: string
}

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
          items: {
            include: {
              product: true,
            },
          },
          inventoryLots: {
            include: {
              product: true,
            },
            orderBy: {
              receivedDate: 'desc',
            },
          },
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
      items,
    } = body

    // Check if using multi-item mode
    const isMultiItem = items && Array.isArray(items) && items.length > 0

    // Calculate total foreign amount
    let totalForeignAmount = 0
    if (isMultiItem) {
      totalForeignAmount = (items as ItemInput[]).reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice))
      }, 0)
    } else {
      totalForeignAmount = parseFloat(foreignAmount)
    }

    // 원화 환산 금액
    const krwAmount = totalForeignAmount * parseFloat(exchangeRate)

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
        quantity: isMultiItem ? (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0) : parseFloat(quantity),
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

    const record = await prisma.$transaction(async (tx) => {
      const newRecord = await tx.importExport.create({
        data: {
          date: new Date(date),
          type,
          productId: isMultiItem ? null : parseInt(productId),
          vendorId: parseInt(vendorId),
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          categoryId: categoryId ? parseInt(categoryId) : null,
          quantity: isMultiItem ? null : parseFloat(quantity),
          currency,
          exchangeRate: parseFloat(exchangeRate),
          foreignAmount: totalForeignAmount,
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

      // Create items if multi-item mode
      if (isMultiItem) {
        await Promise.all((items as ItemInput[]).map((item) => {
          const itemAmount = parseFloat(item.quantity) * parseFloat(item.unitPrice)
          return tx.importExportItem.create({
            data: {
              importExportId: newRecord.id,
              productId: parseInt(item.productId),
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              amount: itemAmount,
              krwAmount: itemAmount * parseFloat(exchangeRate),
            },
          })
        }))
      }

      return newRecord
    })

    // ★★★ 창고 또는 사무실 보관인 경우 자동 입고 처리 ★★★
    if ((storageType === 'WAREHOUSE' || storageType === 'OFFICE') && type === 'IMPORT') {
      if (isMultiItem) {
        // Multi-item: create inventory lot for each item
        const costs = distributeCostsAcrossItems({
          goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          otherCost: otherCost ? parseFloat(otherCost) : null,
          exchangeRate: parseFloat(exchangeRate),
          itemCount: (items as ItemInput[]).length,
        })
        
        await Promise.all((items as ItemInput[]).map((item, index) => {
          return prisma.inventoryLot.create({
            data: {
              productId: parseInt(item.productId),
              vendorId: parseInt(vendorId),
              salespersonId: salespersonId ? parseInt(salespersonId) : null,
              lotCode: `IE-${record.id}-${index + 1}-${Date.now().toString().slice(-4)}`,
              receivedDate: new Date(date),
              quantityReceived: parseFloat(item.quantity),
              quantityRemaining: parseFloat(item.quantity),
              goodsAmount: costs.goodsAmountPerItem,
              dutyAmount: costs.dutyAmountPerItem,
              domesticFreight: costs.shippingCostPerItem,
              otherCost: costs.otherCostPerItem,
              unitCost: unitCost || 0,
              storageLocation: storageType,
              importExportId: record.id,
            },
          })
        }))
      } else {
        // Single item
        await prisma.inventoryLot.create({
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
            storageLocation: storageType,
            importExportId: record.id,
          },
        })
      }
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
      items,
    } = body

    // Check if using multi-item mode
    const isMultiItem = items && Array.isArray(items) && items.length > 0

    // Calculate total foreign amount
    let totalForeignAmount = 0
    if (isMultiItem) {
      totalForeignAmount = (items as ItemInput[]).reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice))
      }, 0)
    } else {
      totalForeignAmount = parseFloat(foreignAmount)
    }

    const krwAmount = totalForeignAmount * parseFloat(exchangeRate)

    let totalCost = null
    let unitCost = null
    
    if (type === 'IMPORT' && goodsAmount) {
      const costCalc = calculateImportCost({
        goodsAmount: parseFloat(goodsAmount),
        exchangeRate: parseFloat(exchangeRate),
        dutyAmount: parseFloat(dutyAmount || 0),
        shippingCost: parseFloat(shippingCost || 0),
        otherCost: parseFloat(otherCost || 0),
        quantity: isMultiItem ? (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0) : parseFloat(quantity),
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

    // Fetch existing record to check previous storageType
    const existingRecord = await prisma.importExport.findUnique({
      where: { id: parseInt(id) },
      select: { storageType: true, type: true },
    })

    // Delete existing items
    await prisma.importExportItem.deleteMany({
      where: { importExportId: parseInt(id) },
    })

    const record = await prisma.importExport.update({
      where: { id: parseInt(id) },
      data: {
        date: new Date(date),
        type,
        productId: isMultiItem ? null : parseInt(productId),
        vendorId: parseInt(vendorId),
        salespersonId: salespersonId ? parseInt(salespersonId) : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        quantity: isMultiItem ? null : parseFloat(quantity),
        currency,
        exchangeRate: parseFloat(exchangeRate),
        foreignAmount: totalForeignAmount,
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

    // Create new items if multi-item mode
    if (isMultiItem) {
      await Promise.all((items as ItemInput[]).map((item) => {
        const itemAmount = parseFloat(item.quantity) * parseFloat(item.unitPrice)
        return prisma.importExportItem.create({
          data: {
            importExportId: record.id,
            productId: parseInt(item.productId),
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice),
            amount: itemAmount,
            krwAmount: itemAmount * parseFloat(exchangeRate),
          },
        })
      }))
    }

    // ★★★ 입고관리(LOT) 자동 연동 로직 ★★★
    // storageType이 WAREHOUSE 또는 OFFICE이고 IMPORT인 경우 LOT 생성/수정
    if ((storageType === 'WAREHOUSE' || storageType === 'OFFICE') && type === 'IMPORT') {
      // 기존 LOT 조회
      const existingLots = await prisma.inventoryLot.findMany({
        where: { importExportId: parseInt(id) },
      })
      
      if (existingLots.length > 0) {
        // 기존 LOT이 있으면 삭제 후 재생성 (수정된 items 반영)
        await prisma.inventoryLot.deleteMany({
          where: { importExportId: parseInt(id) }
        })
      }
      
      // items 또는 단일 품목으로 LOT 생성
      if (isMultiItem && (items as ItemInput[]).length > 0) {
        // Multi-item: create inventory lot for each item
        const costs = distributeCostsAcrossItems({
          goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          otherCost: otherCost ? parseFloat(otherCost) : null,
          exchangeRate: parseFloat(exchangeRate),
          itemCount: (items as ItemInput[]).length,
        })
        
        await Promise.all((items as ItemInput[]).map((item, index) => {
          return prisma.inventoryLot.create({
            data: {
              productId: parseInt(item.productId),
              vendorId: parseInt(vendorId),
              salespersonId: salespersonId ? parseInt(salespersonId) : null,
              lotCode: `IE-${record.id}-${index + 1}-${Date.now().toString().slice(-4)}`,
              receivedDate: new Date(date),
              quantityReceived: parseFloat(item.quantity),
              quantityRemaining: parseFloat(item.quantity),
              goodsAmount: costs.goodsAmountPerItem,
              dutyAmount: costs.dutyAmountPerItem,
              domesticFreight: costs.shippingCostPerItem,
              otherCost: costs.otherCostPerItem,
              unitCost: unitCost || 0,
              storageLocation: storageType,
              importExportId: record.id,
            },
          })
        }))
      } else if (productId && quantity) {
        // Single item: create a single LOT
        await prisma.inventoryLot.create({
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
            storageLocation: storageType,
            importExportId: record.id,
          },
        })
      }
    } else if (type === 'IMPORT') {
      // storageType이 WAREHOUSE/OFFICE가 아닌 경우, 기존 LOT 삭제
      const existingLots = await prisma.inventoryLot.findMany({
        where: { importExportId: parseInt(id) },
      })
      
      if (existingLots.length > 0) {
        await prisma.inventoryLot.deleteMany({
          where: { importExportId: parseInt(id) }
        })
      }
    }

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
