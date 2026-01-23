import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCustomsCleared } from '@/lib/utils'

// POST /api/customs/tracking/[id]/transfer - 통관 정보를 수입/수출로 이동
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tracking = await prisma.customsTracking.findUnique({
      where: { id: params.id },
    })
    
    if (!tracking) {
      return NextResponse.json(
        { error: '통관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 이미 연동되었으면 기존 수입/수출 페이지로 이동
    if (tracking.importId) {
      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        importExportId: tracking.importId,
        message: '이미 수입/수출로 이동되었습니다.',
      })
    }
    
    // 통관완료 상태 체크
    if (!isCustomsCleared(tracking.status)) {
      return NextResponse.json(
        { error: '통관완료 상태의 건만 이동할 수 있습니다.' },
        { status: 400 }
      )
    }
    
    // 기본 거래처 찾기 (해외 매입 거래처 우선)
    let vendor = await prisma.vendor.findFirst({
      where: { type: 'INTERNATIONAL_PURCHASE' },
      orderBy: { id: 'asc' },
    })
    
    if (!vendor) {
      vendor = await prisma.vendor.findFirst({
        orderBy: { id: 'asc' },
      })
    }
    
    if (!vendor) {
      return NextResponse.json(
        { error: '거래처 정보가 없습니다. 먼저 거래처를 등록해주세요.' },
        { status: 400 }
      )
    }
    
    // 환율 가져오기 (가장 최근 USD 환율, 없으면 기본값 1300)
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { currency: 'USD' },
      orderBy: { date: 'desc' },
    })
    const exchangeRate = latestRate?.rate || 1300
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: vendor.id,
        productId: null, // 품목은 수동으로 선택하도록
        currency: 'USD',
        exchangeRate: exchangeRate,
        foreignAmount: 0, // 물품대금은 추후 입력
        krwAmount: tracking.totalTax || 0,
        dutyAmount: tracking.customsDuty || 0,
        vatAmount: tracking.vat || 0,
        totalAmount: tracking.totalTax || 0,
        // PDF 정보 복사
        pdfFileName: tracking.pdfFileName,
        pdfFilePath: tracking.pdfFilePath,
        pdfUploadedAt: tracking.pdfUploadedAt,
        memo: `[통관내역 연동] ${tracking.productName || ''}\nBL: ${tracking.blNumber || '-'}\n신고번호: ${tracking.declarationNumber || '-'}\n중량: ${tracking.weight ? tracking.weight + 'kg' : '-'}`,
      },
    })
    
    // 추적 데이터에 연동 ID 저장
    await prisma.customsTracking.update({
      where: { id: params.id },
      data: {
        importId: importRecord.id,
        linkedAt: new Date(),
      },
    })
    
    return NextResponse.json({
      success: true,
      importExportId: importRecord.id,
      message: '수입/수출로 이동되었습니다. 추가 정보를 입력해주세요.',
    })
  } catch (error) {
    console.error('Error transferring customs to import/export:', error)
    return NextResponse.json(
      { error: '수입/수출로 이동 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
