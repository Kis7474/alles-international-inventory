import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/unipass/sync - 통관 완료 건 자동 동기화
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clearanceId } = body
    
    if (!clearanceId) {
      return NextResponse.json(
        { error: '통관 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 통관 정보 조회
    const clearance = await prisma.customsClearance.findUnique({
      where: { id: clearanceId },
    })
    
    if (!clearance) {
      return NextResponse.json(
        { error: '통관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 이미 동기화된 경우
    if (clearance.importId) {
      return NextResponse.json(
        { error: '이미 수입내역에 연동되어 있습니다.' },
        { status: 400 }
      )
    }
    
    // 통관 완료가 아닌 경우
    if (clearance.status !== '통관완료') {
      return NextResponse.json(
        { error: '통관이 완료된 건만 동기화할 수 있습니다.' },
        { status: 400 }
      )
    }
    
    // 기본 거래처 찾기 (또는 새로 생성)
    // 실제 운영 시에는 거래처를 선택하거나 자동으로 매칭하는 로직 필요
    const defaultVendor = await prisma.vendor.findFirst({
      where: { type: 'INTERNATIONAL_PURCHASE' },
    })
    
    if (!defaultVendor) {
      return NextResponse.json(
        { error: '해외 매입 거래처가 없습니다. 먼저 거래처를 등록해주세요.' },
        { status: 400 }
      )
    }
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        date: clearance.clearanceDate || clearance.arrivalDate || new Date(),
        type: 'IMPORT',
        vendorId: defaultVendor.id,
        currency: 'USD', // 기본값, 실제로는 설정 필요
        exchangeRate: 1300, // 기본값, 실제로는 환율 API에서 가져오기
        foreignAmount: 0, // 외화 금액 정보가 없으므로 0으로 설정
        krwAmount: clearance.totalTax || 0,
        dutyAmount: clearance.customsDuty || 0,
        shippingCost: clearance.shippingCost || 0,
        totalCost: clearance.totalTax || 0,
        memo: `BL번호: ${clearance.blNumber} (${clearance.blYear}) - UNI-PASS 자동 연동`,
      },
    })
    
    // 통관 정보에 수입내역 ID 연결
    await prisma.customsClearance.update({
      where: { id: clearanceId },
      data: {
        importId: importRecord.id,
        syncedAt: new Date(),
      },
    })
    
    return NextResponse.json({
      success: true,
      message: '수입내역에 연동되었습니다.',
      importId: importRecord.id,
    })
  } catch (error) {
    console.error('Error syncing customs clearance:', error)
    return NextResponse.json(
      { error: '동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
