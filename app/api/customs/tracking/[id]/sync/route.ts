import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, parseUnipassDate } from '@/lib/unipass'
import { getUnipassSettings, getApiKeyForRegistrationType } from '@/lib/unipass-helpers'
import { isCustomsCleared } from '@/lib/utils'

interface UpdateDataInput {
  lastSyncAt: Date
  syncCount: number
  status?: string
  productName?: string | null
  weight?: number | null
  packageCount?: number | null
  packageUnit?: string | null
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
    const settings = await getUnipassSettings()
    
    if (!settings) {
      return NextResponse.json(
        { error: '유니패스 API 설정이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 등록 방식에 따라 다른 API 키 사용
    const apiKey = getApiKeyForRegistrationType(settings, 'BL')
    if (!apiKey) {
      return NextResponse.json(
        { error: '화물통관진행정보조회 API 키가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }
    
    // BL 정보 확인
    if (!tracking.blType || !tracking.blNumber || !tracking.blYear) {
      return NextResponse.json(
        { error: 'BL 정보가 올바르지 않습니다.' },
        { status: 400 }
      )
    }
    
    // 등록 방식에 따라 API 호출
    let updateData: UpdateDataInput = {
      lastSyncAt: new Date(),
      syncCount: tracking.syncCount + 1,
    }
    
    const apiResult = await getCargoProgress(apiKey, {
      blType: tracking.blType as 'MBL' | 'HBL',
      blNumber: tracking.blNumber,
      blYear: tracking.blYear,
    })
    
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
      packageCount: data.pckGcnt ? parseInt(data.pckGcnt) : null,
      packageUnit: data.pckUt || null,
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
    if (isCustomsCleared(updateData.status) && !tracking.importId) {
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
    
    if (!tracking) {
      console.error('Tracking not found:', trackingId)
      return
    }
    
    // 이미 연동되었으면 스킵
    if (tracking.importId) {
      console.log('Already linked:', trackingId)
      return
    }
    
    // 통관완료 상태 체크
    if (!isCustomsCleared(tracking.status)) {
      console.log('Not cleared yet:', tracking.status)
      return
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
      console.error('No vendor found for auto-linking')
      return
    }
    
    // rawData에서 추가 정보 파싱
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData: Record<string, any> | null = null
    try {
      if (tracking.rawData) {
        parsedData = JSON.parse(tracking.rawData)
      }
    } catch (e) {
      console.error('Failed to parse rawData:', e)
    }
    
    // 메모에 상세 정보 기록
    const blType = tracking.blType === 'MBL' ? 'Master B/L' : 'House B/L'
    const loadingPortName = parsedData?.ldprNm || '-'
    const loadingCountryCode = parsedData?.lodCntyCd || '-'
    const weightUnit = parsedData?.wghtUt || 'KG'
    
    const memo = `[유니패스 연동 정보]
━━━━━━━━━━━━━━━━━━━━
BL번호: ${tracking.blNumber || '-'} (${blType})
화물관리번호: ${tracking.cargoNumber || '-'}
품명: ${tracking.productName || '-'}
중량: ${tracking.weight || '-'}${weightUnit}
포장: ${tracking.packageCount || '-'}${tracking.packageUnit || ''}
입항일: ${tracking.arrivalDate ? new Date(tracking.arrivalDate).toISOString().split('T')[0] : '-'}
반출일: ${tracking.clearanceDate ? new Date(tracking.clearanceDate).toISOString().split('T')[0] : '-'}
통관상태: ${tracking.status || '-'}
세액: ${tracking.totalTax ? `${tracking.totalTax.toLocaleString('ko-KR')}원` : '-'}
━━━━━━━━━━━━━━━━━━━━
적재항(출발지): ${loadingPortName}
적출국가: ${loadingCountryCode}
━━━━━━━━━━━━━━━━━━━━
* 위 정보를 참고하여 상세 내역을 입력해주세요.`
    
    // 수입내역 생성 - 최소 정보만 채움
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: vendor.id,
        currency: 'USD',
        exchangeRate: 1300, // 기본값 - 사용자가 수정 필요
        foreignAmount: 0, // 사용자가 직접 입력
        krwAmount: 0, // 사용자가 직접 입력
        memo,
      },
    })
    
    console.log('Import record created:', importRecord.id)
    
    // 추적 데이터에 연동 ID 저장
    await prisma.customsTracking.update({
      where: { id: trackingId },
      data: {
        importId: importRecord.id,
        linkedAt: new Date(),
      },
    })
    
    console.log('Tracking linked to import:', trackingId, '->', importRecord.id)
  } catch (error) {
    console.error('Error auto-linking to import:', error)
  }
}
