import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, verifyImportDeclaration } from '@/lib/unipass'

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
    
    // 유니패스 API 키 가져오기
    const apiKeySetting = await prisma.systemSetting.findUnique({
      where: { key: 'unipass_api_key' },
    })
    
    if (!apiKeySetting || !apiKeySetting.value) {
      return NextResponse.json(
        { error: '유니패스 API 키가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }
    
    const apiKey = apiKeySetting.value
    
    // 등록 방식에 따라 API 호출
    let apiResult
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: any = {
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
      weight: data.wght ? parseFloat(data.wght) : null,
      arrivalDate: data.rlbrDt ? new Date(data.rlbrDt) : null,
      declarationDate: data.dclrDt ? new Date(data.dclrDt) : null,
      clearanceDate: data.tkofDt ? new Date(data.tkofDt) : null,
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
    
    // 수입내역 생성
    const importRecord = await prisma.importExport.create({
      data: {
        type: 'IMPORT',
        date: tracking.clearanceDate || tracking.arrivalDate || new Date(),
        vendorId: 1, // TODO: 기본 거래처 ID
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
