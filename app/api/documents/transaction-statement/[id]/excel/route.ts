import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

// GET /api/documents/transaction-statement/[id]/excel - 거래명세서 Excel 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    const statement = await prisma.transactionStatement.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { itemNo: 'asc' }
        }
      }
    })

    if (!statement) {
      return NextResponse.json(
        { error: '거래명세서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Excel 워크북 생성
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('거래명세서')

    // 열 너비 설정
    worksheet.columns = [
      { width: 5 },  // A - No
      { width: 25 }, // B - 제품명
      { width: 15 }, // C - 규격
      { width: 10 }, // D - 수량
      { width: 15 }, // E - 단가
      { width: 15 }, // F - 금액
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
    worksheet.getCell('A3').value = '거래명세서 (납품명세서)'
    worksheet.getCell('A3').font = { size: 14, bold: true }
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(3).height = 25

    // 공백 행
    worksheet.getRow(4).height = 5

    // 거래명세서 정보
    worksheet.getCell('A5').value = '거래번호:'
    worksheet.getCell('B5').value = statement.statementNumber
    worksheet.getCell('D5').value = '거래일:'
    worksheet.getCell('E5').value = statement.deliveryDate.toISOString().split('T')[0]

    // 거래처 정보
    if (statement.recipientName) {
      worksheet.getCell('A6').value = '받는분:'
      worksheet.getCell('B6').value = statement.recipientName
    }
    if (statement.recipientRef) {
      worksheet.getCell('D6').value = '참조:'
      worksheet.getCell('E6').value = statement.recipientRef
    }
    if (statement.recipientPhone) {
      worksheet.getCell('A7').value = '전화:'
      worksheet.getCell('B7').value = statement.recipientPhone
    }
    if (statement.recipientFax) {
      worksheet.getCell('D7').value = '팩스:'
      worksheet.getCell('E7').value = statement.recipientFax
    }

    // 공백 행
    worksheet.getRow(8).height = 5

    // 품목 테이블 헤더
    const headerRow = 9
    worksheet.getRow(headerRow).height = 25

    const headers = ['No', '제품명', '규격', '수량', '단가', '금액']
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
    statement.items.forEach((item) => {
      worksheet.getCell(currentRow, 1).value = item.itemNo
      worksheet.getCell(currentRow, 2).value = item.productName
      worksheet.getCell(currentRow, 3).value = item.specification || ''
      worksheet.getCell(currentRow, 4).value = item.quantity
      worksheet.getCell(currentRow, 5).value = item.unitPrice
      worksheet.getCell(currentRow, 6).value = item.amount

      // 숫자 포맷 적용
      worksheet.getCell(currentRow, 4).numFmt = '#,##0.00'
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
    worksheet.getCell(currentRow, 5).value = '금액(공급가액):'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = statement.subtotal
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    currentRow++
    worksheet.getCell(currentRow, 5).value = '부가세:'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = statement.vatAmount
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    currentRow++
    worksheet.getCell(currentRow, 5).value = '총금액:'
    worksheet.getCell(currentRow, 5).font = { bold: true }
    worksheet.getCell(currentRow, 6).value = statement.totalAmount
    worksheet.getCell(currentRow, 6).numFmt = '#,##0'
    worksheet.getCell(currentRow, 6).font = { bold: true }

    // 지불 조건
    currentRow += 2
    worksheet.getCell(currentRow, 1).value = '지불조건:'
    worksheet.getCell(currentRow, 2).value = statement.paymentTerms || '납품 후 익월 현금결제'
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`)

    // 계좌번호
    currentRow++
    worksheet.getCell(currentRow, 1).value = '계좌번호:'
    worksheet.getCell(currentRow, 2).value = statement.bankAccount || '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)'
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`)

    // 인수자 서명란
    currentRow += 2
    worksheet.getCell(currentRow, 1).value = '인수자:'
    worksheet.getCell(currentRow, 2).value = statement.receiverName || ''
    worksheet.getCell(currentRow, 4).value = '서명:'
    worksheet.getCell(currentRow, 5).value = ''

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

    // Excel 파일 생성
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="transaction_statement_${statement.statementNumber}.xlsx"`,
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
