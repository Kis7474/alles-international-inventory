import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // HTML 템플릿 생성 (프린트 가능한 형태)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>거래명세서 - ${statement.statementNumber}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 5px 0; font-size: 20px; }
    .header h2 { margin: 5px 0; font-size: 16px; }
    .header h3 { margin: 15px 0; font-size: 18px; }
    .info-section { margin: 20px 0; }
    .info-row { display: flex; margin: 5px 0; }
    .info-label { font-weight: bold; width: 120px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #e0e0e0; text-align: center; font-weight: bold; }
    .number { text-align: right; }
    .total-row { background-color: #f5f5f5; font-weight: bold; }
    .signature-section { margin-top: 30px; }
    .footer { margin-top: 40px; font-size: 12px; }
    .footer-section { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>알레스인터네셔날(주)</h1>
    <h2>ALLES International Ltd.</h2>
    <h3>거래명세서 (납품명세서)</h3>
  </div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">거래번호:</div>
      <div>${statement.statementNumber}</div>
      <div class="info-label" style="margin-left: 50px;">거래일:</div>
      <div>${statement.deliveryDate.toISOString().split('T')[0]}</div>
    </div>
    ${statement.recipientName ? `
    <div class="info-row">
      <div class="info-label">받는분:</div>
      <div>${statement.recipientName}</div>
      ${statement.recipientRef ? `
      <div class="info-label" style="margin-left: 50px;">참조:</div>
      <div>${statement.recipientRef}</div>
      ` : ''}
    </div>
    ` : ''}
    ${statement.recipientPhone || statement.recipientFax ? `
    <div class="info-row">
      ${statement.recipientPhone ? `
      <div class="info-label">전화:</div>
      <div>${statement.recipientPhone}</div>
      ` : ''}
      ${statement.recipientFax ? `
      <div class="info-label" style="margin-left: 50px;">팩스:</div>
      <div>${statement.recipientFax}</div>
      ` : ''}
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 35%;">제품명</th>
        <th style="width: 20%;">규격</th>
        <th style="width: 10%;">수량</th>
        <th style="width: 15%;">단가</th>
        <th style="width: 15%;">금액</th>
      </tr>
    </thead>
    <tbody>
      ${statement.items.map(item => `
      <tr>
        <td style="text-align: center;">${item.itemNo}</td>
        <td>${item.productName}</td>
        <td>${item.specification || ''}</td>
        <td class="number">${item.quantity.toLocaleString('ko-KR')}</td>
        <td class="number">${item.unitPrice.toLocaleString('ko-KR')}</td>
        <td class="number">${item.amount.toLocaleString('ko-KR')}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <table style="width: 50%; margin-left: auto;">
    <tr>
      <td style="font-weight: bold;">금액(공급가액):</td>
      <td class="number">${statement.subtotal.toLocaleString('ko-KR')}</td>
    </tr>
    <tr>
      <td style="font-weight: bold;">부가세:</td>
      <td class="number">${statement.vatAmount.toLocaleString('ko-KR')}</td>
    </tr>
    <tr class="total-row">
      <td>총금액:</td>
      <td class="number">${statement.totalAmount.toLocaleString('ko-KR')}</td>
    </tr>
  </table>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">지불조건:</div>
      <div>${statement.paymentTerms || '납품 후 익월 현금결제'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">계좌번호:</div>
      <div>${statement.bankAccount || '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)'}</div>
    </div>
  </div>

  <div class="signature-section">
    <div class="info-row">
      <div class="info-label">인수자:</div>
      <div>${statement.receiverName || '_______________'}</div>
      <div class="info-label" style="margin-left: 50px;">서명:</div>
      <div>_______________</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-section" style="font-weight: bold;">알레스인터네셔날(주)</div>
    <div class="footer-section">주소: 김포시 태장로 741 경동미르웰시티 632호</div>
    <div class="footer-section">전화: (02) 2645-8886 | 팩스: (031) 983-8867</div>
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
