import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

function formatShortDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  return `${parseInt(match[2], 10)}/${parseInt(match[3], 10)}`
}

// GET /api/documents/transaction-statement/[id]/excel - 거래명세서 Excel 다운로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

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

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('거래명세서', {
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.35,
          right: 0.35,
          top: 0.35,
          bottom: 0.35,
          header: 0,
          footer: 0,
        },
      },
    })

    worksheet.columns = [
      { key: 'A', width: 1.5 },
      { key: 'B', width: 4 },
      { key: 'C', width: 7 },
      { key: 'D', width: 10 },
      { key: 'E', width: 10 },
      { key: 'F', width: 9 },
      { key: 'G', width: 8 },
      { key: 'H', width: 2 },
      { key: 'I', width: 7 },
      { key: 'J', width: 4.5 },
      { key: 'K', width: 8.5 },
      { key: 'L', width: 10 },
    ]

    const isMonthlyStatement = statement.recipientRef?.includes('월합명세서') ?? false
    const titleText = isMonthlyStatement ? '거 래 명 세 서' : '납 품 명 세 서'
    const deliveryText = isMonthlyStatement
      ? `${new Date(statement.deliveryDate).getFullYear()}년 ${new Date(statement.deliveryDate).getMonth() + 1}월 납품 내역`
      : new Date(statement.deliveryDate).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })

    worksheet.mergeCells('D2:I2')
    worksheet.getCell('D2').value = titleText
    worksheet.getCell('D2').font = { name: 'Malgun Gothic', size: 30, bold: true }
    worksheet.getCell('D2').alignment = { horizontal: 'center', vertical: 'middle' }
    worksheet.getRow(2).height = 58

    worksheet.mergeCells('B6:C6')
    worksheet.getCell('B6').value = '받는분 :'
    worksheet.getCell('B6').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('D6:F6')
    worksheet.getCell('D6').value = statement.recipientName || ''
    worksheet.getCell('D6').font = { name: 'Malgun Gothic', size: 20, bold: true }

    worksheet.mergeCells('B7:C7')
    worksheet.getCell('B7').value = '참   조 :'
    worksheet.getCell('B7').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('D7:F7')
    worksheet.getCell('D7').value = statement.recipientRef || ''
    worksheet.getCell('D7').font = { name: 'Malgun Gothic', size: 14 }

    worksheet.mergeCells('B8:C8')
    worksheet.getCell('B8').value = '전   화 :'
    worksheet.getCell('B8').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('D8:F8')
    worksheet.getCell('D8').value = statement.recipientPhone || ''
    worksheet.getCell('D8').font = { name: 'Malgun Gothic', size: 14 }

    worksheet.mergeCells('B9:C9')
    worksheet.getCell('B9').value = '팩   스 :'
    worksheet.getCell('B9').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('D9:F9')
    worksheet.getCell('D9').value = statement.recipientFax || ''
    worksheet.getCell('D9').font = { name: 'Malgun Gothic', size: 14 }

    worksheet.mergeCells('I6:L6')
    worksheet.getCell('I6').value = 'ALLES'
    worksheet.getCell('I6').font = { name: 'Calibri', size: 40, bold: true, color: { argb: 'FF0B4C8C' } }
    worksheet.getCell('I6').alignment = { horizontal: 'left', vertical: 'middle' }

    worksheet.mergeCells('I7:L7')
    worksheet.getCell('I7').value = '알레스인터네셔날(주)'
    worksheet.getCell('I7').font = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: 'FF0B4C8C' } }
    worksheet.getCell('I7').alignment = { horizontal: 'center', vertical: 'middle' }

    worksheet.mergeCells('I8:L8')
    worksheet.getCell('I8').value = '김포시 태장로 741'
    worksheet.getCell('I8').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('I9:L9')
    worksheet.getCell('I9').value = '경동미르웰시티 632호'
    worksheet.getCell('I9').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('I10:L10')
    worksheet.getCell('I10').value = '전화  :  (02) 2645 - 8886'
    worksheet.getCell('I10').font = { name: 'Malgun Gothic', size: 14 }
    worksheet.mergeCells('I11:L11')
    worksheet.getCell('I11').value = '팩스  :  (031) 983 - 8867'
    worksheet.getCell('I11').font = { name: 'Malgun Gothic', size: 14 }

    worksheet.mergeCells('B11:F11')
    worksheet.getCell('B11').value = `${isMonthlyStatement ? '납 품 내 역' : '납 품 일'} : ${deliveryText}`
    worksheet.getCell('B11').font = { name: 'Malgun Gothic', size: 14 }

    const borderThin = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    }

    const headerRow = 13
    const bodyStart = 14
    const bodyEnd = 22

    const headers = [
      { range: 'B13:B13', text: isMonthlyStatement ? '날짜' : 'No' },
      { range: 'C13:F13', text: '제   품   명' },
      { range: 'G13:I13', text: '규   격' },
      { range: 'J13:J13', text: '수 량' },
      { range: 'K13:K13', text: '단 가' },
      { range: 'L13:L13', text: '금 액' },
    ]

    headers.forEach(({ range, text }) => {
      worksheet.mergeCells(range)
      const cell = worksheet.getCell(range.split(':')[0])
      cell.value = text
      cell.font = { name: 'Malgun Gothic', size: 14 }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = borderThin
    })
    worksheet.getRow(headerRow).height = 42

    for (let row = bodyStart; row <= bodyEnd; row++) {
      worksheet.mergeCells(`C${row}:F${row}`)
      worksheet.mergeCells(`G${row}:I${row}`)
      ;['B', 'C', 'G', 'J', 'K', 'L'].forEach((col) => {
        const cell = worksheet.getCell(`${col}${row}`)
        cell.border = borderThin
        cell.font = { name: 'Malgun Gothic', size: 14 }
        cell.alignment = { vertical: 'middle', horizontal: col === 'C' ? 'left' : col === 'G' || col === 'B' ? 'center' : 'right' }
      })
      worksheet.getRow(row).height = 38
    }

    statement.items.slice(0, bodyEnd - bodyStart + 1).forEach((item, idx) => {
      const row = bodyStart + idx
      let firstCol = `${item.itemNo}`
      let specText = item.specification || ''
      if (isMonthlyStatement && item.specification) {
        const [datePart, ...rest] = item.specification.split(' / ')
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          firstCol = formatShortDate(datePart)
          specText = rest.join(' / ')
        }
      }

      worksheet.getCell(`B${row}`).value = firstCol
      worksheet.getCell(`C${row}`).value = item.productName
      worksheet.getCell(`G${row}`).value = specText
      worksheet.getCell(`J${row}`).value = item.quantity
      worksheet.getCell(`K${row}`).value = item.unitPrice
      worksheet.getCell(`L${row}`).value = item.amount

      worksheet.getCell(`J${row}`).numFmt = '#,##0'
      worksheet.getCell(`K${row}`).numFmt = '#,##0'
      worksheet.getCell(`L${row}`).numFmt = '#,##0'
    })

    // Memo + totals
    for (let row = 23; row <= 25; row++) {
      worksheet.mergeCells(`B${row}:J${row}`)
      worksheet.getCell(`B${row}`).border = {
        left: { style: 'thin' },
        top: row === 23 ? { style: 'thin' } : undefined,
        bottom: row === 25 ? { style: 'thin' } : undefined,
      }
      worksheet.getCell(`J${row}`).border = {
        right: { style: 'thin' },
        top: row === 23 ? { style: 'thin' } : undefined,
        bottom: row === 25 ? { style: 'thin' } : undefined,
      }
    }

    worksheet.getCell('B23').value = `* 지불조건 : ${statement.paymentTerms || '정기 결제'}`
    worksheet.getCell('B24').value = `* 계좌번호 : ${statement.bankAccount || '하나은행 586-910007-02104'}`
    worksheet.getCell('B25').value = '(예금주 : 알레스인터네셔날 주식회사)'
    ;['B23', 'B24', 'B25'].forEach((addr) => {
      const c = worksheet.getCell(addr)
      c.font = { name: 'Malgun Gothic', size: 14 }
      c.alignment = { vertical: 'middle', horizontal: 'left' }
    })

    const totalLabels = ['금   액', '부가세', '총금액']
    const totalValues = [statement.subtotal, statement.vatAmount, statement.totalAmount]
    for (let i = 0; i < 3; i++) {
      const row = 23 + i
      worksheet.getCell(`K${row}`).value = totalLabels[i]
      worksheet.getCell(`K${row}`).font = { name: 'Malgun Gothic', size: 16 }
      worksheet.getCell(`K${row}`).alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getCell(`K${row}`).border = borderThin

      worksheet.getCell(`L${row}`).value = totalValues[i]
      worksheet.getCell(`L${row}`).font = { name: 'Malgun Gothic', size: 16 }
      worksheet.getCell(`L${row}`).alignment = { horizontal: 'right', vertical: 'middle' }
      worksheet.getCell(`L${row}`).numFmt = '#,##0'
      worksheet.getCell(`L${row}`).border = borderThin
      worksheet.getRow(row).height = 40
    }

    worksheet.mergeCells('B27:G27')
    worksheet.getCell('B27').value = `인수자 서명(이름) : ${statement.receiverName || ''}`
    worksheet.getCell('B27').font = { name: 'Malgun Gothic', size: 16 }

    worksheet.mergeCells('I24:L27')
    const sealCell = worksheet.getCell('I24')
    sealCell.value = '109-86-37337\n알레스인터네셔날(주)'
    sealCell.font = { name: 'Malgun Gothic', size: 12, bold: true, color: { argb: 'FF5C4EC5' } }
    sealCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

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
