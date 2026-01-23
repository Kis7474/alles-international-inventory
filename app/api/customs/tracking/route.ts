import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, verifyImportDeclaration, parseUnipassDate } from '@/lib/unipass'
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
    const { registrationType, blType, blNumber, blYear, declarationNumber } = body
    
    // 유니패스 설정 가져오기
    const settings = await getUnipassSettings()
    
    if (!settings) {
      return NextResponse.json(
        { error: '유니패스 API 설정이 필요합니다. 설정 페이지에서 API 키를 등록해주세요.' },
        { status: 400 }
      )
    }
    
    // 등록 방식에 따라 API 호출
    let apiResult
    let trackingData: TrackingDataInput = {
      registrationType,
      syncCount: 1,
      lastSyncAt: new Date(),
    }
    
    if (registrationType === 'BL') {
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
      apiResult = await getCargoProgress(apiKey, {
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
      
      trackingData = {
        ...trackingData,
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
        rawData: JSON.stringify(cargoData),
      }
    } else if (registrationType === 'DECLARATION') {
      if (!declarationNumber) {
        return NextResponse.json(
          { error: '수입신고번호를 입력해주세요.' },
          { status: 400 }
        )
      }
      
      // 수입신고필증검증 API 키 확인
      const apiKey = getApiKeyForRegistrationType(settings, 'DECLARATION')
      if (!apiKey) {
        return NextResponse.json(
          { error: '수입신고필증검증 API 키가 설정되지 않았습니다.' },
          { status: 400 }
        )
      }
      
      // 수입신고번호로 조회
      apiResult = await verifyImportDeclaration(apiKey, declarationNumber)
      
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
      
      const declarationData = apiResult.data[0]
      
      trackingData = {
        ...trackingData,
        declarationNumber,
        status: declarationData.prgsStts || '수입신고수리',
        productName: declarationData.prnm,
        weight: declarationData.ttwg ? parseFloat(declarationData.ttwg) : null,
        customsDuty: declarationData.csclTotaTxamt ? parseFloat(declarationData.csclTotaTxamt) : null,
        totalTax: declarationData.csclTotaTxamt ? parseFloat(declarationData.csclTotaTxamt) : null,
        rawData: JSON.stringify(declarationData),
      }
    } else {
      return NextResponse.json(
        { error: '올바른 등록 방식을 선택해주세요.' },
        { status: 400 }
      )
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
        { error: '이미 등록된 BL번호 또는 수입신고번호입니다.' },
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
        memo: `[유니패스 자동연동] ${tracking.productName || ''} / BL: ${tracking.blNumber || ''} / 신고번호: ${tracking.declarationNumber || ''}`,
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
