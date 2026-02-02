import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateImportLinkMemo } from '@/lib/unipass-helpers'
import { isCustomsCleared } from '@/lib/utils'

// POST /api/customs/tracking/[id]/link - 수동 연동
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    const tracking = await prisma.customsTracking.findUnique({
      where: { id },
    })
    
    if (!tracking) {
      return NextResponse.json(
        { error: '통관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (tracking.importId) {
      return NextResponse.json({
        success: true,
        message: '이미 수입 내역에 연동되었습니다.',
        importId: tracking.importId,
      })
    }
    
    if (!isCustomsCleared(tracking.status)) {
      return NextResponse.json(
        { error: `통관완료 상태가 아닙니다. (현재: ${tracking.status})` },
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
      // 자동으로 기본 해외 매입 거래처 생성
      vendor = await prisma.vendor.create({
        data: {
          code: 'DEFAULT_INTL_PURCHASE',
          name: '기본 해외 매입처',
          type: 'INTERNATIONAL_PURCHASE',
          currency: 'USD',
        },
      })
    }
    
    // 메모 생성
    const memo = generateImportLinkMemo(tracking)
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: vendor.id,
        currency: 'USD',
        exchangeRate: 1300,
        foreignAmount: 0,
        krwAmount: 0,
        storageType: 'WAREHOUSE',  // 기본값으로 창고입고 설정
        memo,
        pdfFileName: tracking.pdfFileName,
        pdfFilePath: tracking.pdfFilePath,
        pdfUploadedAt: tracking.pdfUploadedAt,
      },
    })
    
    // 추적 데이터에 연동 ID 저장
    await prisma.customsTracking.update({
      where: { id },
      data: {
        importId: importRecord.id,
        linkedAt: new Date(),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: '수입 내역에 연동되었습니다.',
      importId: importRecord.id,
    })
  } catch (error) {
    console.error('Error linking to import:', error)
    return NextResponse.json(
      { error: '연동 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
