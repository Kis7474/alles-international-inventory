import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, verifyImportDeclaration, parseUnipassDate } from '@/lib/unipass'

interface UpdateDataInput {
  lastSyncAt: Date
  syncCount: number
  status?: string
  productName?: string | null
  weight?: number | null
  arrivalDate?: Date | null
  declarationDate?: Date | null
  clearanceDate?: Date | null
  customsDuty?: number | null
  totalTax?: number | null
  rawData?: string
}

// POST /api/customs/tracking/[id]/sync - 개별 동기화
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
    
    // 유니패스 설정 가져오기
    const settings = await prisma.systemSetting.findUnique({
      where: { key: 'unipass_settings' },
    })
    
    if (!settings?.value) {
      return NextResponse.json(
        { error: '유니패스 API 설정이 필요합니다.' },
        { status: 400 }
      )
    }
    
    const parsed = typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value
    
    // 등록 방식에 따라 다른 API 키 사용
    let apiKey: string
    if (tracking.registrationType === 'BL') {
      apiKey = parsed.apiKeyCargoProgress
      if (!apiKey) {
        return NextResponse.json(
          { error: '화물통관진행정보조회 API 키가 설정되지 않았습니다.' },
          { status: 400 }
        )
      }
    } else {
      apiKey = parsed.apiKeyImportDeclaration
      if (!apiKey) {
        return NextResponse.json(
          { error: '수입신고필증검증 API 키가 설정되지 않았습니다.' },
          { status: 400 }
        )
      }
    }
    
    // 등록 방식에 따라 API 호출
    let apiResult
    let updateData: UpdateDataInput = {
      lastSyncAt: new Date(),
      syncCount: tracking.syncCount + 1,
    }
    
    if (tracking.registrationType === 'BL') {
      if (!tracking.blType || !tracking.blNumber || !tracking.blYear) {
        return NextResponse.json(
          { error: 'BL 정보가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
      
      apiResult = await getCargoProgress(apiKey, {
        blType: tracking.blType as 'MBL' | 'HBL',
        blNumber: tracking.blNumber,
        blYear: tracking.blYear,
      })
    } else if (tracking.registrationType === 'DECLARATION') {
      if (!tracking.declarationNumber) {
        return NextResponse.json(
          { error: '수입신고번호가 올바르지 않습니다.' },
          { status: 400 }
        )
      }
      
      apiResult = await verifyImportDeclaration(apiKey, tracking.declarationNumber)
    } else {
      return NextResponse.json(
        { error: '올바른 등록 방식이 아닙니다.' },
        { status: 400 }
      )
    }
    
    if (!apiResult.success) {
      return NextResponse.json(
        { error: apiResult.message || '유니패스 API 조회에 실패했습니다.' },
        { status: 400 }
      )
    }
    
    if (!apiResult.data || apiResult.data.length === 0) {
      return NextResponse.json(
        { error: '조회된 통관 정보가 없습니다.' },
        { status: 404 }
      )
    }
    
    const data = apiResult.data[0]
    
    // 업데이트할 데이터 구성
    updateData = {
      ...updateData,
      status: data.prgsStts,
      productName: data.prnm,
      weight: data.ttwg ? parseFloat(data.ttwg) : null,
      arrivalDate: data.etprDt ? parseUnipassDate(data.etprDt) : null,
      declarationDate: data.dclrDt ? parseUnipassDate(data.dclrDt) : null,
      clearanceDate: data.tkofDt ? parseUnipassDate(data.tkofDt) : null,
      customsDuty: data.csclTotaTxamt ? parseFloat(data.csclTotaTxamt) : null,
      totalTax: data.csclTotaTxamt ? parseFloat(data.csclTotaTxamt) : null,
      rawData: JSON.stringify(data),
    }
    
    // 업데이트
    const updatedTracking = await prisma.customsTracking.update({
      where: { id: params.id },
      data: updateData,
    })
    
    // 통관완료 상태이고 아직 연동되지 않았으면 자동 연동
    if ((updateData.status === '통관완료' || updateData.status === '수입신고수리') && !tracking.importId) {
      await autoLinkToImport(params.id)
    }
    
    return NextResponse.json({
      success: true,
      message: '통관 정보가 동기화되었습니다.',
      tracking: updatedTracking,
    })
  } catch (error) {
    console.error('Error syncing customs tracking:', error)
    return NextResponse.json(
      { error: '통관 정보 동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 통관완료 시 자동으로 수입내역에 연동하는 함수
async function autoLinkToImport(trackingId: string) {
  try {
    const tracking = await prisma.customsTracking.findUnique({
      where: { id: trackingId },
    })
    
    if (!tracking || tracking.importId) {
      return
    }
    
    // 기본 거래처 찾기 (해외 매입 거래처 우선)
    let vendor = await prisma.vendor.findFirst({
      where: { type: 'INTERNATIONAL_PURCHASE' },
      orderBy: { id: 'asc' },
    })
    
    // 없으면 아무 거래처나 사용
    if (!vendor) {
      vendor = await prisma.vendor.findFirst({
        orderBy: { id: 'asc' },
      })
    }
    
    if (!vendor) {
      console.error('No vendor found for auto-linking')
      return
    }
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: vendor.id,
        currency: 'USD',
        exchangeRate: 1300, // TODO: 실제 환율 적용
        foreignAmount: 0,
        krwAmount: tracking.totalTax || 0,
        dutyAmount: tracking.customsDuty || 0,
        vatAmount: tracking.vat || 0,
        totalAmount: tracking.totalTax || 0,
        memo: `[유니패스 자동연동] ${tracking.productName || ''}`,
      },
    })
    
    // 추적 데이터에 연동 ID 저장
    await prisma.customsTracking.update({
      where: { id: trackingId },
      data: {
        importId: importRecord.id,
        linkedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error auto-linking to import:', error)
  }
}
