import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, parseUnipassDate } from '@/lib/unipass'
import { getUnipassSettings, getApiKeyForRegistrationType, generateImportLinkMemo } from '@/lib/unipass-helpers'
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
  forwarderCode?: string | null
  forwarderName?: string | null
  rawData?: string
}

// GET /api/customs/tracking - 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    interface WhereClause {
      status?: string
      arrivalDate?: {
        gte?: Date
        lte?: Date
      }
    }
    
    const where: WhereClause = {}
    if (status) {
      where.status = status
    }
    
    // Add date range filter
    if (startDate && endDate) {
      where.arrivalDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
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
      // 타임아웃이나 연결 오류인 경우 더 명확한 메시지
      let errorMessage = apiResult.message || '유니패스 API 조회에 실패했습니다.'
      
      if (errorMessage.includes('시간 초과') || errorMessage.includes('ETIMEDOUT')) {
        errorMessage = 'UNI-PASS API 서버 응답 시간 초과입니다. 잠시 후 다시 시도해주세요.'
      } else if (errorMessage.includes('연결') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'UNI-PASS API 서버에 연결할 수 없습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
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
      forwarderCode: cargoData.frwrSgn || null,
      forwarderName: cargoData.frwrEntsConm || null,
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
async function autoLinkToImport(trackingId: string): Promise<{ success: boolean; message: string; importId?: number }> {
  try {
    const tracking = await prisma.customsTracking.findUnique({
      where: { id: trackingId },
    })
    
    if (!tracking) {
      return { success: false, message: '통관 정보를 찾을 수 없습니다.' }
    }
    
    if (tracking.importId) {
      return { success: true, message: '이미 수입 내역에 연동되었습니다.', importId: tracking.importId }
    }
    
    if (!isCustomsCleared(tracking.status)) {
      return { success: false, message: `통관완료 상태가 아닙니다. (현재: ${tracking.status})` }
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
      where: { id: trackingId },
      data: {
        importId: importRecord.id,
        linkedAt: new Date(),
      },
    })
    
    return { success: true, message: '수입 내역에 자동 연동되었습니다.', importId: importRecord.id }
  } catch (error) {
    console.error('Error auto-linking to import:', error)
    return { success: false, message: `연동 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` }
  }
}
