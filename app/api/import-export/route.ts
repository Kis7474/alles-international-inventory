import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { distributeCostsAcrossItems, calculateUnitCost } from '@/lib/utils'

interface ItemInput {
  productId: string
  quantity: string
  unitPrice: string
}

export async function GET(request: Request) {
  // Logic to handle GET request
  return NextResponse.json({ message: 'GET request handled' })
}

export async function POST(request: Request) {
  const data = await request.json()
  // Logic to handle POST request
  return NextResponse.json({ message: 'POST request handled', data })
}

// PUT /api/import-export - 수입/수출 기록 수정
export async function PUT(request: Request) {
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
      totalCost,
      unitCost,
      storageType,
      vatIncluded,
      supplyAmount,
      vatAmount,
      totalAmount,
      memo,
      items,
      pdfFileName,
      pdfFilePath,
      pdfUploadedAt,
    } = body

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // Check if record exists
    const existingRecord = await prisma.importExport.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: '수입/수출 기록을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Determine if this is a multi-item record
    const isMultiItem = items && Array.isArray(items) && items.length > 0

    // Calculate KRW amount
    const parsedExchangeRate = parseFloat(exchangeRate)
    const parsedForeignAmount = parseFloat(foreignAmount) || 0
    const krwAmount = parsedForeignAmount * parsedExchangeRate

    // Prepare update data
    const updateData: any = {
      date: date ? new Date(date) : undefined,
      type: type || undefined,
      vendorId: vendorId ? parseInt(vendorId) : undefined,
      salespersonId: salespersonId ? parseInt(salespersonId) : null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      currency: currency || undefined,
      exchangeRate: parsedExchangeRate || undefined,
      foreignAmount: parsedForeignAmount || undefined,
      krwAmount: krwAmount || undefined,
      goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
      dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
      shippingCost: shippingCost ? parseFloat(shippingCost) : null,
      otherCost: otherCost ? parseFloat(otherCost) : null,
      totalCost: totalCost ? parseFloat(totalCost) : null,
      unitCost: unitCost ? parseFloat(unitCost) : null,
      storageType: storageType || null,
      vatIncluded: vatIncluded !== undefined ? Boolean(vatIncluded) : undefined,
      supplyAmount: supplyAmount ? parseFloat(supplyAmount) : null,
      vatAmount: vatAmount ? parseFloat(vatAmount) : null,
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      memo: memo || null,
    }

    // Handle PDF fields
    if (pdfFileName !== undefined) updateData.pdfFileName = pdfFileName || null
    if (pdfFilePath !== undefined) updateData.pdfFilePath = pdfFilePath || null
    if (pdfUploadedAt !== undefined) updateData.pdfUploadedAt = pdfUploadedAt ? new Date(pdfUploadedAt) : null

    // Handle single item vs multi-item
    if (!isMultiItem) {
      // Single item mode
      updateData.productId = productId ? parseInt(productId) : null
      updateData.quantity = quantity ? parseFloat(quantity) : null
    } else {
      // Multi-item mode - clear single item fields
      updateData.productId = null
      updateData.quantity = null
    }

    // Update the import/export record
    const record = await prisma.importExport.update({
      where: { id: parseInt(id) },
      data: updateData,
    })

    // Handle multi-item updates
    if (isMultiItem) {
      // Delete existing items
      await prisma.importExportItem.deleteMany({
        where: { importExportId: parseInt(id) },
      })

      // Create new items
      await Promise.all((items as ItemInput[]).map((item) => {
        const itemQuantity = parseFloat(item.quantity)
        const itemUnitPrice = parseFloat(item.unitPrice)
        const itemAmount = itemQuantity * itemUnitPrice
        const itemKrwAmount = itemAmount * parsedExchangeRate

        return prisma.importExportItem.create({
          data: {
            importExportId: parseInt(id),
            productId: parseInt(item.productId),
            quantity: itemQuantity,
            unitPrice: itemUnitPrice,
            amount: itemAmount,
            krwAmount: itemKrwAmount,
          },
        })
      }))
    }

    // ★★★ LOT 동기화 로직 ★★★
    // storageType이 WAREHOUSE 또는 OFFICE이고 type이 IMPORT인 경우
    if ((storageType === 'WAREHOUSE' || storageType === 'OFFICE') && type === 'IMPORT') {
      // 기존 LOT 삭제
      await prisma.inventoryLot.deleteMany({
        where: { importExportId: parseInt(id) },
      })

      // 새 LOT 생성
      if (isMultiItem) {
        // Multi-item: 각 품목별로 LOT 생성
        const costs = distributeCostsAcrossItems({
          goodsAmount: goodsAmount ? parseFloat(goodsAmount) : null,
          dutyAmount: dutyAmount ? parseFloat(dutyAmount) : null,
          shippingCost: shippingCost ? parseFloat(shippingCost) : null,
          otherCost: otherCost ? parseFloat(otherCost) : null,
          exchangeRate: parseFloat(exchangeRate),
          itemCount: (items as ItemInput[]).length,
        })

        await Promise.all((items as ItemInput[]).map((item, index) => {
          const itemQuantity = parseFloat(item.quantity)
          const totalItemCost = costs.goodsAmountPerItem + costs.dutyAmountPerItem + 
                                costs.shippingCostPerItem + costs.otherCostPerItem
          const itemUnitCost = calculateUnitCost(
            costs.goodsAmountPerItem,
            costs.dutyAmountPerItem,
            costs.shippingCostPerItem,
            costs.otherCostPerItem,
            itemQuantity
          )

          return prisma.inventoryLot.create({
            data: {
              productId: parseInt(item.productId),
              vendorId: parseInt(vendorId),
              salespersonId: salespersonId ? parseInt(salespersonId) : null,
              lotCode: `IE-${record.id}-${index + 1}-${Date.now().toString().slice(-4)}`,
              receivedDate: new Date(date),
              quantityReceived: itemQuantity,
              quantityRemaining: itemQuantity,
              goodsAmount: costs.goodsAmountPerItem,
              dutyAmount: costs.dutyAmountPerItem,
              domesticFreight: costs.shippingCostPerItem,
              otherCost: costs.otherCostPerItem,
              unitCost: itemUnitCost,
              storageLocation: storageType,
              importExportId: record.id,
            },
          })
        }))
      } else if (productId && quantity) {
        // Single item: 하나의 LOT 생성
        const parsedGoodsAmount = goodsAmount ? parseFloat(goodsAmount) * parseFloat(exchangeRate) : 0
        const parsedDutyAmount = dutyAmount ? parseFloat(dutyAmount) : 0
        const parsedShippingCost = shippingCost ? parseFloat(shippingCost) : 0
        const parsedOtherCost = otherCost ? parseFloat(otherCost) : 0
        const parsedQuantity = parseFloat(quantity)

        const calculatedUnitCost = calculateUnitCost(
          parsedGoodsAmount,
          parsedDutyAmount,
          parsedShippingCost,
          parsedOtherCost,
          parsedQuantity
        )

        await prisma.inventoryLot.create({
          data: {
            productId: parseInt(productId),
            vendorId: parseInt(vendorId),
            salespersonId: salespersonId ? parseInt(salespersonId) : null,
            lotCode: `IE-${record.id}-${Date.now().toString().slice(-4)}`,
            receivedDate: new Date(date),
            quantityReceived: parsedQuantity,
            quantityRemaining: parsedQuantity,
            goodsAmount: parsedGoodsAmount,
            dutyAmount: parsedDutyAmount,
            domesticFreight: parsedShippingCost,
            otherCost: parsedOtherCost,
            unitCost: calculatedUnitCost,
            storageLocation: storageType,
            importExportId: record.id,
          },
        })
      }
    } else if (storageType !== 'WAREHOUSE' && storageType !== 'OFFICE') {
      // storageType이 창고/사무실이 아닌 경우 기존 LOT 삭제
      await prisma.inventoryLot.deleteMany({
        where: { importExportId: parseInt(id) },
      })
    }

    return NextResponse.json({
      success: true,
      record,
      message: '수입/수출 기록이 수정되었습니다.',
    })
  } catch (error) {
    console.error('Error updating import/export record:', error)
    return NextResponse.json(
      { error: '수입/수출 기록 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}