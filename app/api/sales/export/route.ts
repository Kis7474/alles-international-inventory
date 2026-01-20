import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

// GET /api/sales/export - 매입매출 엑셀 다운로드
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const salespersonId = searchParams.get('salespersonId')
    const categoryId = searchParams.get('categoryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    interface WhereClause {
      type?: string
      salespersonId?: number
      categoryId?: number
      date?: {
        gte?: Date
        lte?: Date
      }
    }

    const where: WhereClause = {}

    if (type) {
      where.type = type
    }
    if (salespersonId) {
      where.salespersonId = parseInt(salespersonId)
    }
    if (categoryId) {
      where.categoryId = parseInt(categoryId)
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const sales = await prisma.salesRecord.findMany({
      where,
      include: {
        salesperson: true,
        category: true,
        product: true,
        vendor: true,
      },
      orderBy: { date: 'desc' },
    })

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('매입매출내역')

    // Define columns
    worksheet.columns = [
      { header: '날짜', key: 'date', width: 12 },
      { header: '구분', key: 'type', width: 8 },
      { header: '담당자', key: 'salesperson', width: 10 },
      { header: '카테고리', key: 'category', width: 15 },
      { header: '품목명', key: 'itemName', width: 30 },
      { header: '거래처', key: 'vendor', width: 20 },
      { header: '수량', key: 'quantity', width: 10 },
      { header: '단가', key: 'unitPrice', width: 15 },
      { header: '총액(부가세제외)', key: 'amount', width: 18 },
      { header: '부가세', key: 'vat', width: 15 },
      { header: '총액(부가세포함)', key: 'totalWithVat', width: 18 },
      { header: '마진', key: 'margin', width: 15 },
      { header: '마진율', key: 'marginRate', width: 10 },
      { header: '비고', key: 'notes', width: 30 },
    ]

    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Add data rows
    sales.forEach((record) => {
      const vat = record.amount * 0.1 // 10% VAT
      const totalWithVat = record.amount + vat
      
      worksheet.addRow({
        date: new Date(record.date).toLocaleDateString('ko-KR'),
        type: record.type === 'SALES' ? '매출' : '매입',
        salesperson: record.salesperson.name,
        category: record.category.nameKo,
        itemName: record.itemName,
        vendor: record.vendor?.name || record.customer || '-',
        quantity: record.quantity,
        unitPrice: record.unitPrice,
        amount: record.amount,
        vat: vat,
        totalWithVat: totalWithVat,
        margin: record.type === 'SALES' ? record.margin : '-',
        marginRate: record.type === 'SALES' ? `${record.marginRate.toFixed(1)}%` : '-',
        notes: record.notes || '',
      })
    })

    // Format number columns
    worksheet.getColumn('quantity').numFmt = '#,##0.00'
    worksheet.getColumn('unitPrice').numFmt = '#,##0'
    worksheet.getColumn('amount').numFmt = '#,##0'
    worksheet.getColumn('vat').numFmt = '#,##0'
    worksheet.getColumn('totalWithVat').numFmt = '#,##0'

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer()

    // Create filename with current date
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const filename = `매입매출내역_${today}.xlsx`

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error) {
    console.error('Error exporting sales data:', error)
    return NextResponse.json(
      { error: '엑셀 다운로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
