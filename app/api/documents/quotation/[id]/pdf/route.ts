import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/documents/quotation/[id]/pdf - 견적서 PDF 다운로드
// Note: This returns HTML that can be printed to PDF
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

    // HTML 템플릿 생성 (프린트 가능한 형태)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>견적서 - ${quotation.quotationNumber}</title>
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
    .footer { margin-top: 40px; font-size: 12px; }
    .footer-section { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>알레스인터네셔날(주)</h1>
    <h2>ALLES International Ltd.</h2>
    <h3>견적서 (QUOTATION)</h3>
  </div>

  <div class="info-section">
    <div class="info-row">
      <div class="info-label">견적번호:</div>
      <div>${quotation.quotationNumber}</div>
      <div class="info-label" style="margin-left: 50px;">견적일자:</div>
      <div>${quotation.quotationDate.toISOString().split('T')[0]}</div>
    </div>
    ${quotation.salesPersonName ? `
    <div class="info-row">
      <div class="info-label">견적담당자:</div>
      <div>${quotation.salesPersonName}</div>
      ${quotation.salesPersonPhone ? `
      <div class="info-label" style="margin-left: 50px;">연락처:</div>
      <div>${quotation.salesPersonPhone}</div>
      ` : ''}
    </div>
    ` : ''}
    ${quotation.customerName ? `
    <div class="info-row">
      <div class="info-label">수신:</div>
      <div>${quotation.customerName}</div>
      ${quotation.customerRef ? `
      <div class="info-label" style="margin-left: 50px;">참조:</div>
      <div>${quotation.customerRef}</div>
      ` : ''}
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 40%;">Description</th>
        <th style="width: 10%;">Qty</th>
        <th style="width: 10%;">UOM</th>
        <th style="width: 17%;">Unit Price</th>
        <th style="width: 18%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${quotation.items.map(item => `
      <tr>
        <td style="text-align: center;">${item.itemNo}</td>
        <td>${item.description}</td>
        <td class="number">${item.quantity.toLocaleString('ko-KR')}</td>
        <td style="text-align: center;">${item.unit || 'EA'}</td>
        <td class="number">${item.unitPrice.toLocaleString('ko-KR')}</td>
        <td class="number">${item.amount.toLocaleString('ko-KR')}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <table style="width: 50%; margin-left: auto;">
    <tr>
      <td style="font-weight: bold;">합계:</td>
      <td class="number">${quotation.subtotal.toLocaleString('ko-KR')}</td>
    </tr>
    <tr>
      <td style="font-weight: bold;">부가세:</td>
      <td class="number">${quotation.vatAmount.toLocaleString('ko-KR')}</td>
    </tr>
    <tr class="total-row">
      <td>총액:</td>
      <td class="number">${quotation.totalAmount.toLocaleString('ko-KR')}</td>
    </tr>
  </table>

  ${quotation.deliveryTerms || quotation.paymentTerms || quotation.validityPeriod ? `
  <div class="info-section">
    ${quotation.deliveryTerms ? `<div class="info-row"><div class="info-label">납기:</div><div>${quotation.deliveryTerms}</div></div>` : ''}
    ${quotation.paymentTerms ? `<div class="info-row"><div class="info-label">지불조건:</div><div>${quotation.paymentTerms}</div></div>` : ''}
    ${quotation.validityPeriod ? `<div class="info-row"><div class="info-label">유효기간:</div><div>${quotation.validityPeriod}</div></div>` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-section" style="font-weight: bold;">알레스인터네셔날(주)</div>
    <div class="footer-section">주소: 김포시 태장로 741 경동미르웰시티 632호</div>
    <div class="footer-section">전화: (02) 2645-8886 | 팩스: (031) 983-8867</div>
    <div class="footer-section">홈페이지: http://www.alleskr.com/</div>
    <div class="footer-section">은행: 하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)</div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
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
