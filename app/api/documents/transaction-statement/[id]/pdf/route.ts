import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COMPANY_NAME = '알레스인터네셔날(주)'
const COMPANY_ADDRESS = '경기도 김포시 태장로 741, 경동미르웰시티 632호'
const COMPANY_PHONE = '(02) 2645-8886'
const COMPANY_FAX = '(031) 983-8867'

function formatDateKor(date: Date): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMonthKor(date: Date): string {
  const d = new Date(date)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

function formatShortDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  return `${parseInt(match[2], 10)}/${parseInt(match[3], 10)}`
}

// GET /api/documents/transaction-statement/[id]/pdf - 거래명세서 PDF 다운로드
// Note: This returns HTML that can be printed to PDF
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

    const logoUrl = `${request.nextUrl.origin}/images/alles-logo.svg`
    const isMonthlyStatement = statement.recipientRef?.includes('월합명세서') ?? false
    const title = isMonthlyStatement ? '거 래 명 세 서' : '납 품 명 세 서'
    const leftDateLabel = isMonthlyStatement ? '납 품 내 역' : '납 품 일'
    const leftDateValue = isMonthlyStatement
      ? `${formatMonthKor(statement.deliveryDate)} 납품 내역`
      : formatDateKor(statement.deliveryDate)

    const itemRows = Array.from({ length: Math.max(8, statement.items.length) }, (_, index) => {
      const item = statement.items[index]

      if (!item) {
        return `
        <tr>
          <td class="center">&nbsp;</td>
          <td></td>
          <td class="center"></td>
          <td class="number"></td>
          <td class="number"></td>
          <td class="number"></td>
        </tr>`
      }

      let firstCol = `${item.itemNo}`
      let specText = item.specification || ''
      if (isMonthlyStatement && item.specification) {
        const [datePart, ...rest] = item.specification.split(' / ')
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          firstCol = formatShortDate(datePart)
          specText = rest.join(' / ')
        }
      }

      return `
      <tr>
        <td class="center">${firstCol}</td>
        <td>${item.productName}</td>
        <td class="center">${specText}</td>
        <td class="number">${item.quantity.toLocaleString('ko-KR')}</td>
        <td class="number">₩&nbsp;${item.unitPrice.toLocaleString('ko-KR')}</td>
        <td class="number">₩&nbsp;${item.amount.toLocaleString('ko-KR')}</td>
      </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>거래명세서 - ${statement.statementNumber}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; }
    .sheet { width: 100%; padding: 4mm 6mm; }
    .title { text-align: center; font-size: 20mm; letter-spacing: 6mm; font-weight: 700; margin: 8mm 0 14mm; }
    .top { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8mm; }
    .left-info .row, .right-info .row { font-size: 4.8mm; margin-bottom: 3.2mm; line-height: 1.3; }
    .left-info .name { font-weight: 700; letter-spacing: 1.4mm; }
    .label { display: inline-block; min-width: 28mm; }
    .logo { width: 62mm; height: auto; margin-bottom: 2mm; }
    .section-title { margin: 9mm 0 4mm; font-size: 5mm; }

    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .items th, .items td { border: 0.35mm solid #1a1a1a; height: 12mm; padding: 1.2mm 2mm; font-size: 4.6mm; }
    .items th { text-align: center; font-weight: 500; letter-spacing: 1mm; }
    .items .col-1 { width: 8%; }
    .items .col-2 { width: 41%; }
    .items .col-3 { width: 16%; }
    .items .col-4 { width: 7%; }
    .items .col-5 { width: 14%; }
    .items .col-6 { width: 14%; }
    .center { text-align: center; }
    .number { text-align: right; white-space: nowrap; }

    .bottom-wrap { display: grid; grid-template-columns: 1fr 31%; }
    .memo {
      border-left: 0.35mm solid #1a1a1a;
      border-right: 0.35mm solid #1a1a1a;
      border-bottom: 0.35mm solid #1a1a1a;
      padding: 4mm;
      min-height: 31mm;
      font-size: 4.6mm;
      line-height: 1.9;
    }
    .totals td {
      border-right: 0.35mm solid #1a1a1a;
      border-bottom: 0.35mm solid #1a1a1a;
      border-left: 0.35mm solid #1a1a1a;
      height: 10.3mm;
      font-size: 5mm;
      padding: 1mm 2mm;
    }
    .totals .label-cell { text-align: center; letter-spacing: 1.2mm; }

    .signature {
      margin-top: 8mm;
      display: grid;
      grid-template-columns: 1fr 37mm;
      align-items: end;
    }
    .signature .text { font-size: 5.2mm; }
    .stamp { width: 37mm; height: 26mm; border: 0.3mm dashed #7c7c7c; font-size: 3.2mm; color: #666; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="title">${title}</div>

    <div class="top">
      <div class="left-info">
        <div class="row"><span class="label">받는분 :</span> <span class="name">${statement.recipientName || ''}</span></div>
        <div class="row"><span class="label">참&nbsp;&nbsp;&nbsp;조 :</span> ${statement.recipientRef || ''}</div>
        <div class="row"><span class="label">전&nbsp;&nbsp;&nbsp;화 :</span> ${statement.recipientPhone || ''}</div>
        <div class="row"><span class="label">팩&nbsp;&nbsp;&nbsp;스 :</span> ${statement.recipientFax || ''}</div>
      </div>
      <div class="right-info">
        <img src="${logoUrl}" alt="ALLES 로고" class="logo" />
        <div class="row">${COMPANY_ADDRESS}</div>
        <div class="row">전화&nbsp;&nbsp;:&nbsp;&nbsp;${COMPANY_PHONE}</div>
        <div class="row">팩스&nbsp;&nbsp;:&nbsp;&nbsp;${COMPANY_FAX}</div>
      </div>
    </div>

    <div class="section-title">${leftDateLabel} : ${leftDateValue}</div>

    <table class="items">
      <thead>
        <tr>
          <th class="col-1">${isMonthlyStatement ? '날짜' : 'No'}</th>
          <th class="col-2">제&nbsp;&nbsp;품&nbsp;&nbsp;명</th>
          <th class="col-3">규&nbsp;&nbsp;격</th>
          <th class="col-4">수&nbsp;량</th>
          <th class="col-5">단&nbsp;가</th>
          <th class="col-6">금&nbsp;&nbsp;액</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="bottom-wrap">
      <div class="memo">
        * 지불조건 : ${statement.paymentTerms || '정기 결제'}<br />
        * 계좌번호 : ${statement.bankAccount || '하나은행 586-910007-02104'}<br />
        &nbsp;&nbsp;(예금주 : ${COMPANY_NAME})
      </div>
      <table class="totals">
        <tr>
          <td class="label-cell">금&nbsp;&nbsp;액</td>
          <td class="number">₩&nbsp;${statement.subtotal.toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
          <td class="label-cell">부가세</td>
          <td class="number">₩&nbsp;${statement.vatAmount.toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
          <td class="label-cell">총금액</td>
          <td class="number">₩&nbsp;${statement.totalAmount.toLocaleString('ko-KR')}</td>
        </tr>
      </table>
    </div>

    <div class="signature">
      <div class="text">인수자 서명(이름) : ${statement.receiverName || ''}</div>
      <div class="stamp">직인</div>
    </div>
  </div>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'PDF 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
