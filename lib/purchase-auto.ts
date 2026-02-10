/**
 * 매입(PURCHASE) SalesRecord 자동 생성 유틸리티
 */

import { prisma } from '@/lib/prisma'

export interface AutoPurchaseParams {
  productId: number // 품목 ID
  vendorId: number // 매입 거래처 ID (Product.purchaseVendorId)
  salespersonId: number // 담당자 ID
  categoryId: number // 카테고리 ID (Product.categoryId)
  quantity: number // 수량
  unitPrice: number // 매입 단가 (수입원가 또는 defaultPurchasePrice)
  date: Date // 날짜
  itemName: string // 품목명
  costSource: 'IMPORT_AUTO' | 'INBOUND_AUTO' | 'SALES_AUTO' // 자동생성 출처
  notes?: string // 비고
  linkedSalesId?: number // 연동된 매출 SalesRecord ID (매출-매입 쌍 추적용)
  importExportId?: number // 수입등록 ID (수입등록에서 자동생성된 경우)
}

/**
 * 매입(PURCHASE) SalesRecord 자동 생성
 * @param params - 매입 레코드 생성 파라미터
 * @returns 생성된 SalesRecord
 */
export async function createAutoPurchaseRecord(params: AutoPurchaseParams) {
  const {
    productId,
    vendorId,
    salespersonId,
    categoryId,
    quantity,
    unitPrice,
    date,
    itemName,
    costSource,
    notes,
    linkedSalesId,
    importExportId,
  } = params

  // 금액 계산
  const amount = quantity * unitPrice

  // 매입 레코드 생성
  const purchaseRecord = await prisma.salesRecord.create({
    data: {
      date,
      type: 'PURCHASE',
      salespersonId,
      categoryId,
      productId,
      vendorId,
      itemName,
      quantity,
      unitPrice,
      amount,
      cost: 0, // 매입 레코드는 원가 0
      margin: 0,
      marginRate: 0,
      costSource,
      linkedSalesId: linkedSalesId || null,
      importExportId: importExportId || null,
      notes: notes || null,
    },
    include: {
      salesperson: true,
      category: true,
      product: true,
      vendor: true,
    },
  })

  return purchaseRecord
}

/**
 * 수입등록 ID로 연동된 매입 레코드 삭제
 * @param importExportId - 수입등록 ID
 */
export async function deleteAutoPurchaseByImportId(importExportId: number) {
  await prisma.salesRecord.deleteMany({
    where: {
      importExportId,
      costSource: 'IMPORT_AUTO',
    },
  })
}

/**
 * 매출 ID로 연동된 매입 레코드 삭제
 * @param salesId - 매출 SalesRecord ID
 */
export async function deleteAutoPurchaseBySalesId(salesId: number) {
  await prisma.salesRecord.deleteMany({
    where: {
      linkedSalesId: salesId,
      costSource: 'SALES_AUTO',
    },
  })
}

/**
 * 매출 ID로 연동된 매입 레코드 조회
 * @param salesId - 매출 SalesRecord ID
 * @returns 연동된 매입 레코드 배열
 */
export async function getLinkedPurchaseBySalesId(salesId: number) {
  return await prisma.salesRecord.findMany({
    where: {
      linkedSalesId: salesId,
      type: 'PURCHASE',
    },
  })
}

/**
 * 수입등록 ID로 연동된 매입 레코드 조회
 * @param importExportId - 수입등록 ID
 * @returns 연동된 매입 레코드 배열
 */
export async function getLinkedPurchaseByImportId(importExportId: number) {
  return await prisma.salesRecord.findMany({
    where: {
      importExportId,
      type: 'PURCHASE',
    },
  })
}
