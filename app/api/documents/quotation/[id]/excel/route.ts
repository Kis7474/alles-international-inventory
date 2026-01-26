import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

// GET /api/documents/quotation/[id]/excel - 견적서 Excel 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { itemNo: 'asc' }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Excel 워크북 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('견적서')

    // 열 너비 설정
    worksheet.columns = [
      { width: 5 },  // A - No
      { width: 30 }, // B - Description
      { width: 10 }, // C - Qty
      { width: 8 },  // D - UOM
      { width: 15 }, // E - Unit Price
      { width: 15 }, // F - Amount
    ]

    // 회사 정보 헤더
    worksheet.mergeCells('A1:F1')
    worksheet.getCell('A1').value = '알레스인터네셔날(주)'
    worksheet.getCell('A1').font = { size: 16, bold: true }
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells('A2:F2')
    worksheet.getCell('A2').value = 'ALLES International Ltd.'
    worksheet.getCell('A2').font = { size: 12, bold: true }
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells('A3:F3')
    worksheet.getCell('A3').value = '견적서 (QUOTATION)'
    worksheet.getCell('A3').font = { size: 14, bold: true }
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(3).height = 25

    // 공백 행
    worksheet.getRow(4).height = 5

    // 견적서 정보
    worksheet.getCell('A5').value = '견적번호:'
    worksheet.getCell('B5').value = quotation.quotationNumber
    worksheet.getCell('D5').value = '견적일자:'
    worksheet.getCell('E5').value = quotation.quotationDate.toISOString().split('T')[0]

    if (quotation.salesPersonName) {
      worksheet.getCell('A6').value = '견적담당자:'
      worksheet.getCell('B6').value = quotation.salesPersonName
    }
    if (quotation.salesPersonPhone) {
      worksheet.getCell('D6').value = '연락처:'
      worksheet.getCell('E6').value = quotation.salesPersonPhone
    }

    // 공백 행
    worksheet.getRow(7).height = 5

    // 거래처 정보
    if (quotation.customerName || quotation.customerRef) {
      worksheet.getCell('A8').value = '수신:'
      worksheet.getCell('B8').value = quotation.customerName || ''
      if (quotation.customerRef) {
        worksheet.getCell('D8').value = '참조:'
        worksheet.getCell('E8').value = quotation.customerRef
      }
    }

    // 품목 테이블 헤더 (행 10부터 시작)
    const headerRow = 10
    worksheet.getRow(headerRow).height = 25

    const headers = ['No', 'Description', 'Qty', 'UOM', 'Unit Price', 'Amount']
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(headerRow, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // 품목 데이터
    let currentRow = headerRow + 1
    quotation.items.forEach((item) => {
      worksheet.getCell(currentRow, 1).value = item.itemNo
      worksheet.getCell(currentRow, 2).value = item.description
      worksheet.getCell(currentRow, 3).value = item.quantity
      worksheet.getCell(currentRow, 4).value = item.unit || 'EA'
      worksheet.getCell(currentRow, 5).value = item.unitPrice
      worksheet.getCell(currentRow, 6).value = item.amount

      // 숫자 포맷 적용
      worksheet.getCell(currentRow, 3).numFmt = '#,##0.00'
      worksheet.getCell(currentRow, 5).numFmt = '#,##0'
      worksheet.getCell(currentRow, 6).numFmt = '#,##0'

      // 테두리 적용
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(currentRow, col).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      }

      currentRow++
    })

    // 합계 행
    currentRow += 1
    worksheet.getCell(currentRow, 5).value = '합계:'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = quotation.subtotal
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    currentRow++
    worksheet.getCell(currentRow, 5).value = '부가세:'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = quotation.vatAmount
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    currentRow++
    worksheet.getCell(currentRow, 5).value = '총액:'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = quotation.totalAmount
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    // 추가 정보
    currentRow += 2
    if (quotation.deliveryTerms) {
      worksheet.getCell(currentRow, 1).value = '납기:'
      worksheet.getCell(currentRow, 2).value = quotation.deliveryTerms
      currentRow++
    }
    if (quotation.paymentTerms) {
      worksheet.getCell(currentRow, 1).value = '지불조건:'
      worksheet.getCell(currentRow, 2).value = quotation.paymentTerms
      currentRow++
    }
    if (quotation.validityPeriod) {
      worksheet.getCell(currentRow, 1).value = '유효기간:'
      worksheet.getCell(currentRow, 2).value = quotation.validityPeriod
      currentRow++
    }

    // 회사 정보 하단
    currentRow += 2
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    worksheet.getCell(`A${currentRow}`).value = '알레스인터네셔날(주)'
    worksheet.getCell(`A${currentRow}`).font = { bold: true }
    
    currentRow++
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    worksheet.getCell(`A${currentRow}`).value = '주소: 김포시 태장로 741 경동미르웰시티 632호'
    
    currentRow++
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    worksheet.getCell(`A${currentRow}`).value = '전화: (02) 2645-8886 | 팩스: (031) 983-8867'
    
    currentRow++
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    worksheet.getCell(`A${currentRow}`).value = '홈페이지: http://www.alleskr.com/'
    
    currentRow++
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    worksheet.getCell(`A${currentRow}`).value = '은행: 하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)'

    // Excel 파일 생성
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="quotation_${quotation.quotationNumber}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Error generating Excel:', error)
    return NextResponse.json(
      { error: 'Excel 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
