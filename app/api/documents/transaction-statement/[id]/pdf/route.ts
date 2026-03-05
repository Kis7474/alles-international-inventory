import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COMPANY_NAME = '알레스인터네셔날(주)'
const COMPANY_ADDRESS = '경기도 김포시 태장로 741, 경동미르웰시티 632호'
const COMPANY_PHONE = '(02) 2645-8886'
const COMPANY_FAX = '(031) 983-8867'


// GET /api/documents/transaction-statement/[id]/pdf - 거래명세서 PDF 다운로드
// Note: This returns HTML that can be printed to PDF
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

    const logoUrl = `${request.nextUrl.origin}/images/alles-logo.svg`
    const formattedDeliveryDate = new Date(statement.deliveryDate).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const itemRows = Array.from({ length: Math.max(8, statement.items.length) }, (_, index) => {
      const item = statement.items[index]

      if (!item) {
        return `
        <tr>
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>`
      }

      return `
      <tr>
        <td>${item.itemNo}</td>
        <td>${item.productName}</td>
        <td>${item.specification || ''}</td>
        <td class="number">${item.quantity.toLocaleString('ko-KR')}</td>
        <td class="number">${item.unitPrice.toLocaleString('ko-KR')}</td>
        <td class="number">${item.amount.toLocaleString('ko-KR')}</td>
      </tr>`
    }).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>거래명세서 - ${statement.statementNumber}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: 'Malgun Gothic', sans-serif; color: #111; font-size: 14px; }
    .container { width: 100%; }
    .title { text-align: center; font-size: 52px; letter-spacing: 14px; margin: 10px 0 30px; font-weight: 700; }
    .top { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
    .customer p, .company p { margin: 9px 0; font-size: 34px; }
    .label { display: inline-block; width: 90px; }
    .company { text-align: left; }
    .logo { width: 300px; margin-bottom: 8px; }
    .month-title { text-align: center; font-size: 35px; margin: 20px 0 12px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #111; padding: 8px 6px; font-size: 28px; }
    th { text-align: center; font-weight: 700; background: #fafafa; }
    td { vertical-align: middle; }
    .col-no { width: 7%; text-align: center; }
    .col-product { width: 40%; }
    .col-spec { width: 15%; text-align: center; }
    .col-qty { width: 8%; text-align: right; }
    .col-price { width: 15%; text-align: right; }
    .col-amount { width: 15%; text-align: right; }
    .number { text-align: right; }
    .notes-wrap { display: grid; grid-template-columns: 1fr 240px; }
    .notes { border: 1px solid #111; border-top: none; padding: 14px; font-size: 32px; line-height: 1.85; min-height: 210px; }
    .totals { border-left: none; border-top: none; }
    .totals td { border: 1px solid #111; font-size: 35px; }
    .totals .label-cell { text-align: center; width: 50%; font-weight: 700; }
    .signature { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature .text { font-size: 36px; margin-top: 20px; }
    .stamp { width: 220px; height: 140px; border: 1px dashed #666; color: #555; font-size: 18px; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">거 래 명 세 서</div>

    <div class="top">
      <div class="customer">
        <p><span class="label">받는분 :</span> ${statement.recipientName || '-'}</p>
        <p><span class="label">참&nbsp;&nbsp;&nbsp;조 :</span> ${statement.recipientRef || '-'}</p>
        <p><span class="label">전&nbsp;&nbsp;&nbsp;화 :</span> ${statement.recipientPhone || '-'}</p>
        <p><span class="label">팩&nbsp;&nbsp;&nbsp;스 :</span> ${statement.recipientFax || '-'}</p>
      </div>
      <div class="company">
        <img src="${logoUrl}" alt="ALLES 로고" class="logo" />
        <p>${COMPANY_ADDRESS}</p>
        <p>전화 : ${COMPANY_PHONE}</p>
        <p>팩스 : ${COMPANY_FAX}</p>
      </div>
    </div>

    <div class="month-title">${formattedDeliveryDate} 납품 내역</div>

    <table>
      <thead>
        <tr>
          <th class="col-no">No</th>
          <th class="col-product">제 품 명</th>
          <th class="col-spec">규 격</th>
          <th class="col-qty">수 량</th>
          <th class="col-price">단 가</th>
          <th class="col-amount">금 액</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="notes-wrap">
      <div class="notes">
        * 지불조건 : ${statement.paymentTerms || '정기 결제'}<br />
        * 계좌번호 : ${statement.bankAccount || '하나은행 586-910007-02104'}<br />
        (예금주 : ${COMPANY_NAME})
      </div>
      <table class="totals">
        <tr>
          <td class="label-cell">금 액</td>
          <td class="number">${statement.subtotal.toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
          <td class="label-cell">부가세</td>
          <td class="number">${statement.vatAmount.toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
          <td class="label-cell">총금액</td>
          <td class="number">${statement.totalAmount.toLocaleString('ko-KR')}</td>
        </tr>
      </table>
    </div>

    <div class="signature">
      <div class="text">인수자 서명(이름) : ${statement.receiverName || ''}</div>
      <div class="stamp">사업자 직인 영역</div>
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
