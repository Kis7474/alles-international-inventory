import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, verifyImportDeclaration } from '@/lib/unipass'

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
    
    // 유니패스 API 키 가져오기
    const apiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'unipass_api_key' },
    })
    
    if (!apiKeySetting || !apiKeySetting.value) {
      return NextResponse.json(
        { error: '유니패스 API 키가 설정되지 않았습니다. 설정 페이지에서 API 키를 등록해주세요.' },
        { status: 400 }
      )
    }
    
    const apiKey = apiKeySetting.value
    
    // 등록 방식에 따라 API 호출
    let apiResult
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let trackingData: any = {
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
        weight: cargoData.wght ? parseFloat(cargoData.wght) : null,
        arrivalDate: cargoData.rlbrDt ? new Date(cargoData.rlbrDt) : null,
        declarationDate: cargoData.dclrDt ? new Date(cargoData.dclrDt) : null,
        clearanceDate: cargoData.tkofDt ? new Date(cargoData.tkofDt) : null,
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
        weight: declarationData.wght ? parseFloat(declarationData.wght) : null,
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
    if (trackingData.status === '통관완료' || trackingData.status === '수입신고수리') {
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
    
    if (!tracking || tracking.importId) {
      // 이미 연동되었거나 찾을 수 없음
      return
    }
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: 1, // TODO: 기본 거래처 ID (실제로는 설정에서 가져와야 함)
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
    // 에러가 발생해도 무시 (추후 수동 연동 가능)
  }
}
