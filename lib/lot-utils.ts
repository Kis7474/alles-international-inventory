import { prisma } from '@/lib/prisma'

interface ItemInput {
  productId: string
  quantity: string
  unitPrice: string
  palletQuantities?: number[]
}

interface CreateLotsOptions {
  vendorId: number
  salespersonId?: number | null
  date: Date
  storageType: string
  unitCost: number | null
  exchangeRate: number
  goodsAmount?: number | null
  dutyAmount?: number | null
  shippingCost?: number | null
  otherCost?: number | null
}

/**
 * 수입/수출 items 기반으로 LOT들을 생성합니다.
 */
export async function createLotsFromItems(
  importExportId: number,
  items: ItemInput[],
  options: CreateLotsOptions
) {
  const {
    vendorId,
    salespersonId,
    date,
    storageType,
    exchangeRate,
    dutyAmount,
    shippingCost,
    otherCost
  } = options

  // 총 수량 계산 (부대비용 분배용)
  const totalQuantity = items.reduce((sum, item) => sum + parseFloat(item.quantity), 0)
  
  // 부대비용 합계 (관세 + 운송료 + 기타비용)
  const totalAdditionalCosts = (dutyAmount || 0) + (shippingCost || 0) + (otherCost || 0)
  
  // 부대비용 단가 = 총 부대비용 / 총 수량
  const additionalCostPerUnit = totalQuantity > 0 ? totalAdditionalCosts / totalQuantity : 0

  const lotCreatePromises = []

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const quantity = parseFloat(item.quantity)
    const unitPrice = parseFloat(item.unitPrice)

    // 품목별 외화 금액 (원화 환산)
    const itemGoodsAmountKrw = unitPrice * exchangeRate * quantity

    // 품목별 입고 단가 = (외화 단가 × 환율) + (부대비용 / 총 수량)
    const itemUnitCost = (unitPrice * exchangeRate) + additionalCostPerUnit

    const parsedPalletQuantities = Array.isArray(item.palletQuantities)
      ? item.palletQuantities
          .map((palletQty) => Number(palletQty))
          .filter((palletQty) => Number.isFinite(palletQty) && palletQty > 0)
      : []

    const lotQuantities = parsedPalletQuantities.length > 0 ? parsedPalletQuantities : [quantity]

    for (let palletIndex = 0; palletIndex < lotQuantities.length; palletIndex += 1) {
      const lotQuantity = lotQuantities[palletIndex]
      const ratio = quantity > 0 ? lotQuantity / quantity : 0
      const lotCodeSuffix = lotQuantities.length > 1 ? `-P${palletIndex + 1}` : ''

      lotCreatePromises.push(
        prisma.inventoryLot.create({
          data: {
            productId: parseInt(item.productId),
            vendorId,
            salespersonId: salespersonId || null,
            lotCode: `IE-${importExportId}-${index + 1}-${Date.now().toString().slice(-4)}${lotCodeSuffix}`,
            receivedDate: date,
            quantityReceived: lotQuantity,
            quantityRemaining: lotQuantity,
            goodsAmount: itemGoodsAmountKrw * ratio,
            dutyAmount: ((dutyAmount || 0) * (quantity / totalQuantity)) * ratio,
            domesticFreight: ((shippingCost || 0) * (quantity / totalQuantity)) * ratio,
            otherCost: ((otherCost || 0) * (quantity / totalQuantity)) * ratio,
            unitCost: itemUnitCost,
            storageLocation: storageType,
            importExportId,
          },
        })
      )
    }
  }

  return Promise.all(lotCreatePromises)
}

/**
 * 단일 품목으로 LOT를 생성합니다.
 */
export async function createSingleLot(
  importExportId: number,
  productId: number,
  quantity: number,
  options: CreateLotsOptions & { 
    goodsAmountKrw?: number
  }
) {
  const {
    vendorId,
    salespersonId,
    date,
    storageType,
    unitCost,
    goodsAmountKrw,
    dutyAmount,
    shippingCost,
    otherCost
  } = options

  return prisma.inventoryLot.create({
    data: {
      productId,
      vendorId,
      salespersonId: salespersonId || null,
      lotCode: `IE-${importExportId}-${Date.now().toString().slice(-4)}`,
      receivedDate: date,
      quantityReceived: quantity,
      quantityRemaining: quantity,
      goodsAmount: goodsAmountKrw || 0,
      dutyAmount: dutyAmount || 0,
      domesticFreight: shippingCost || 0,
      otherCost: otherCost || 0,
      unitCost: unitCost || 0,
      storageLocation: storageType,
      importExportId,
    },
  })
}

/**
 * 기존 LOT들과 새 items를 비교하여 변경 여부를 확인합니다.
 */
export function checkItemsChanged(
  existingLots: { productId: number | null; quantityReceived: number }[],
  newItems: ItemInput[]
): boolean {
  // LOT 수가 다르면 변경됨
  if (existingLots.length !== newItems.length) {
    return true
  }

  // 각 LOT의 productId와 quantity 비교
  const existingSet = new Set(
    existingLots.map(lot => `${lot.productId}-${lot.quantityReceived}`)
  )
  
  for (const item of newItems) {
    const key = `${parseInt(item.productId)}-${parseFloat(item.quantity)}`
    if (!existingSet.has(key)) {
      return true
    }
  }

  return false
}

/**
 * importExportId에 연결된 모든 LOT의 보관위치를 변경합니다.
 */
export async function updateLotsStorageLocation(
  importExportId: number,
  storageLocation: string
) {
  return prisma.inventoryLot.updateMany({
    where: { importExportId },
    data: { storageLocation }
  })
}

/**
 * importExportId에 연결된 모든 LOT를 삭제합니다.
 */
export async function deleteLotsForImportExport(importExportId: number) {
  return prisma.inventoryLot.deleteMany({
    where: { importExportId }
  })
}
