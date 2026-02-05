import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createLotsFromItems, 
  createSingleLot, 
  checkItemsChanged,
  updateLotsStorageLocation,
  deleteLotsForImportExport 
} from '@/lib/lot-utils'
import { updateProductPurchasePrice, updateProductCurrentCost } from '@/lib/product-cost'

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
      quantity,
      currency,
      exchangeRate,
      foreignAmount,
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

    // 수입 원가 계산 - Use krwAmount as goods amount
    let totalCost = null
    let unitCost = null
    
    if (type === 'IMPORT') {
      const totalQuantity = isMultiItem 
        ? (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0) 
        : parseFloat(quantity)
      
      // Calculate total cost = goods amount (krw) + duty + shipping + other costs
      totalCost = krwAmount + (parseFloat(dutyAmount) || 0) + (parseFloat(shippingCost) || 0) + (parseFloat(otherCost) || 0)
      unitCost = totalQuantity > 0 ? totalCost / totalQuantity : 0
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
          categoryId: null, // Category removed
          quantity: isMultiItem ? null : parseFloat(quantity),
          currency,
          exchangeRate: parseFloat(exchangeRate),
          foreignAmount: totalForeignAmount,
          krwAmount,
          goodsAmount: null, // goodsAmount removed, using krwAmount instead
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
        await createLotsFromItems(record.id, items as ItemInput[], {
          vendorId: parseInt(vendorId),
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          date: new Date(date),
          storageType,
          unitCost: null, // Will be calculated per item
          exchangeRate: parseFloat(exchangeRate),
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          otherCost: otherCost ? parseFloat(otherCost) : null,
        })
      } else {
        // Single item
        await createSingleLot(record.id, parseInt(productId), parseFloat(quantity), {
          vendorId: parseInt(vendorId),
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          date: new Date(date),
          storageType,
          unitCost,
          exchangeRate: parseFloat(exchangeRate),
          goodsAmountKrw: krwAmount, // Use krwAmount directly
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          otherCost: otherCost ? parseFloat(otherCost) : null,
        })
      }
    }

    // ★★★ 수입등록 후 품목 원가 업데이트 ★★★
    if (type === 'IMPORT' && unitCost && unitCost > 0) {
      const effectiveDate = new Date(date)
      
      if (isMultiItem) {
        // Multi-item: update each product
        const totalQuantity = (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0)
        const totalAdditionalCosts = (parseFloat(dutyAmount) || 0) + (parseFloat(shippingCost) || 0) + (parseFloat(otherCost) || 0)
        const additionalCostPerUnit = totalQuantity > 0 ? totalAdditionalCosts / totalQuantity : 0
        
        for (const item of items as ItemInput[]) {
          const itemUnitCost = (parseFloat(item.unitPrice) * parseFloat(exchangeRate)) + additionalCostPerUnit
          await updateProductPurchasePrice(parseInt(item.productId), itemUnitCost, effectiveDate)
          
          // Update currentCost for WAREHOUSE storage
          if (storageType === 'WAREHOUSE') {
            await updateProductCurrentCost(parseInt(item.productId))
          }
        }
      } else {
        // Single item
        await updateProductPurchasePrice(parseInt(productId), unitCost, effectiveDate)
        
        // Update currentCost for WAREHOUSE storage
        if (storageType === 'WAREHOUSE') {
          await updateProductCurrentCost(parseInt(productId))
        }
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
      quantity,
      currency,
      exchangeRate,
      foreignAmount,
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

    // 수입 원가 계산 - Use krwAmount as goods amount
    let totalCost = null
    let unitCost = null
    
    if (type === 'IMPORT') {
      const totalQuantity = isMultiItem 
        ? (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0) 
        : parseFloat(quantity)
      
      // Calculate total cost = goods amount (krw) + duty + shipping + other costs
      totalCost = krwAmount + (parseFloat(dutyAmount) || 0) + (parseFloat(shippingCost) || 0) + (parseFloat(otherCost) || 0)
      unitCost = totalQuantity > 0 ? totalCost / totalQuantity : 0
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
        categoryId: null, // Category removed
        quantity: isMultiItem ? null : parseFloat(quantity),
        currency,
        exchangeRate: parseFloat(exchangeRate),
        foreignAmount: totalForeignAmount,
        krwAmount,
        goodsAmount: null, // goodsAmount removed, using krwAmount instead
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

    // ★★★ WAREHOUSE/OFFICE인 경우 최적화된 LOT 처리 ★★★
    if ((storageType === 'WAREHOUSE' || storageType === 'OFFICE') && type === 'IMPORT') {
      // 기존 LOT 조회
      const existingLots = await prisma.inventoryLot.findMany({
        where: { importExportId: parseInt(id) }
      })
      
      if (existingLots.length > 0) {
        // items가 변경되지 않았고 storageType만 변경된 경우 → storageLocation만 업데이트
        const itemsChanged = isMultiItem 
          ? checkItemsChanged(existingLots, items as ItemInput[])
          : (existingLots.length !== 1 || 
             existingLots[0].productId !== parseInt(productId) || 
             existingLots[0].quantityReceived !== parseFloat(quantity)) // 단일 품목도 최적화
        
        if (!itemsChanged) {
          // LOT의 보관위치만 변경
          await updateLotsStorageLocation(parseInt(id), storageType)
        } else {
          // items가 변경된 경우 삭제 후 재생성
          await deleteLotsForImportExport(parseInt(id))
          if (isMultiItem) {
            await createLotsFromItems(record.id, items as ItemInput[], {
              vendorId: parseInt(vendorId),
              salespersonId: salespersonId ? parseInt(salespersonId) : null,
              date: new Date(date),
              storageType,
              unitCost: null, // Will be calculated per item
              exchangeRate: parseFloat(exchangeRate),
              dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
              shippingCost: shippingCost ? parseFloat(shippingCost) : null,
              otherCost: otherCost ? parseFloat(otherCost) : null,
            })
          } else if (productId && quantity) {
            await createSingleLot(record.id, parseInt(productId), parseFloat(quantity), {
              vendorId: parseInt(vendorId),
              salespersonId: salespersonId ? parseInt(salespersonId) : null,
              date: new Date(date),
              storageType,
              unitCost,
              exchangeRate: parseFloat(exchangeRate),
              goodsAmountKrw: krwAmount, // Use krwAmount directly
              dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
              shippingCost: shippingCost ? parseFloat(shippingCost) : null,
              otherCost: otherCost ? parseFloat(otherCost) : null,
            })
          }
        }
      } else {
        // 기존 LOT이 없는 경우 새로 생성
        if (isMultiItem) {
          await createLotsFromItems(record.id, items as ItemInput[], {
            vendorId: parseInt(vendorId),
            salespersonId: salespersonId ? parseInt(salespersonId) : null,
            date: new Date(date),
            storageType,
            unitCost: null, // Will be calculated per item
            exchangeRate: parseFloat(exchangeRate),
            dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
            shippingCost: shippingCost ? parseFloat(shippingCost) : null,
            otherCost: otherCost ? parseFloat(otherCost) : null,
          })
        } else if (productId && quantity) {
          await createSingleLot(record.id, parseInt(productId), parseFloat(quantity), {
            vendorId: parseInt(vendorId),
            salespersonId: salespersonId ? parseInt(salespersonId) : null,
            date: new Date(date),
            storageType,
            unitCost,
            exchangeRate: parseFloat(exchangeRate),
            goodsAmountKrw: krwAmount, // Use krwAmount directly
            dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
            shippingCost: shippingCost ? parseFloat(shippingCost) : null,
            otherCost: otherCost ? parseFloat(otherCost) : null,
          })
        }
      }
    } else if (storageType !== 'WAREHOUSE' && storageType !== 'OFFICE') {
      // storageType이 창고/사무실이 아닌 경우 기존 LOT 삭제
      await deleteLotsForImportExport(parseInt(id))
    }

    // ★★★ 수입수정 후 품목 원가 재계산 ★★★
    if (type === 'IMPORT' && unitCost && unitCost > 0) {
      const effectiveDate = new Date(date)
      
      if (isMultiItem) {
        // Multi-item: update each product
        const totalQuantity = (items as ItemInput[]).reduce((sum, item) => sum + parseFloat(item.quantity), 0)
        const totalAdditionalCosts = (parseFloat(dutyAmount) || 0) + (parseFloat(shippingCost) || 0) + (parseFloat(otherCost) || 0)
        const additionalCostPerUnit = totalQuantity > 0 ? totalAdditionalCosts / totalQuantity : 0
        
        for (const item of items as ItemInput[]) {
          const itemUnitCost = (parseFloat(item.unitPrice) * parseFloat(exchangeRate)) + additionalCostPerUnit
          await updateProductPurchasePrice(parseInt(item.productId), itemUnitCost, effectiveDate)
          
          // Update currentCost for WAREHOUSE storage
          if (storageType === 'WAREHOUSE') {
            await updateProductCurrentCost(parseInt(item.productId))
          }
        }
      } else if (productId) {
        // Single item
        await updateProductPurchasePrice(parseInt(productId), unitCost, effectiveDate)
        
        // Update currentCost for WAREHOUSE storage
        if (storageType === 'WAREHOUSE') {
          await updateProductCurrentCost(parseInt(productId))
        }
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