import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, parseUnipassDate } from '@/lib/unipass'
import { getUnipassSettings, getApiKeyForRegistrationType } from '@/lib/unipass-helpers'
import { isCustomsCleared } from '@/lib/utils'

interface TrackingDataInput {
  registrationType: string
  syncCount: number
  lastSyncAt: Date
  blType?: string
  blNumber?: string
  blYear?: string
  declarationNumber?: string
  cargoNumber?: string | null
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

// GET /api/customs/tracking - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    interface WhereClause {
      status?: string
    }
    
    const where: WhereClause = {}
    if (status) {
      where.status = status
    }
    
    const trackings = await prisma.customsTracking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        import: true,
      },
    })
    
    return NextResponse.json(trackings)
  } catch (error) {
    console.error('Error fetching customs trackings:', error)
    return NextResponse.json(
      { error: '통관 추적 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/customs/tracking - 신규 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { blType, blNumber, blYear } = body
    
    // 유니패스 설정 가져오기
    const settings = await getUnipassSettings()
    
    if (!settings) {
      return NextResponse.json(
        { error: '유니패스 API 설정이 필요합니다. 설정 페이지에서 API 키를 등록해주세요.' },
        { status: 400 }
      )
    }
    
    if (!blType || !blNumber || !blYear) {
      return NextResponse.json(
        { error: 'BL 유형, BL번호, 입항년도를 모두 입력해주세요.' },
        { status: 400 }
      )
    }
    
    // 화물통관진행정보조회 API 키 확인
    const apiKey = getApiKeyForRegistrationType(settings, 'BL')
    if (!apiKey) {
      return NextResponse.json(
        { error: '화물통관진행정보조회 API 키가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }
    
    // BL번호로 조회
    const apiResult = await getCargoProgress(apiKey, {
      blType,
      blNumber,
      blYear,
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
    
    const cargoData = apiResult.data[0]
    
    const trackingData: TrackingDataInput = {
      registrationType: 'BL',
      blType,
      blNumber,
      blYear,
      cargoNumber: cargoData.cargMtNo,
      status: cargoData.prgsStts,
      productName: cargoData.prnm,
      weight: cargoData.ttwg ? parseFloat(cargoData.ttwg) : null,
      arrivalDate: cargoData.etprDt ? parseUnipassDate(cargoData.etprDt) : null,
      declarationDate: cargoData.dclrDt ? parseUnipassDate(cargoData.dclrDt) : null,
      clearanceDate: cargoData.tkofDt ? parseUnipassDate(cargoData.tkofDt) : null,
      customsDuty: cargoData.csclTotaTxamt ? parseFloat(cargoData.csclTotaTxamt) : null,
      totalTax: cargoData.csclTotaTxamt ? parseFloat(cargoData.csclTotaTxamt) : null,
      packageCount: cargoData.pckGcnt ? parseInt(cargoData.pckGcnt) : null,
      packageUnit: cargoData.pckUt || null,
      rawData: JSON.stringify(cargoData),
      syncCount: 1,
      lastSyncAt: new Date(),
    }
    
    // DB에 저장
    const tracking = await prisma.customsTracking.create({
      data: trackingData,
    })
    
    // 통관완료 상태면 자동으로 수입내역에 연동
    if (isCustomsCleared(trackingData.status)) {
      await autoLinkToImport(tracking.id)
    }
    
    return NextResponse.json({
      success: true,
      message: '통관 정보가 등록되었습니다.',
      tracking,
    })
  } catch (error: unknown) {
    console.error('Error creating customs tracking:', error)
    
    // Unique constraint error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: '이미 등록된 BL번호입니다.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '통관 정보 등록 중 오류가 발생했습니다.' },
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
