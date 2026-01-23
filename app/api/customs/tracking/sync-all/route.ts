import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, parseUnipassDate } from '@/lib/unipass'
import { getUnipassSettings, getApiKeyForRegistrationType, generateImportLinkMemo } from '@/lib/unipass-helpers'
import { isCustomsCleared } from '@/lib/utils'

// POST /api/customs/tracking/sync-all - 전체 동기화
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  try {
    // 유니패스 설정 가져오기
    const settings = await getUnipassSettings()
    
    if (!settings) {
      return NextResponse.json(
        { error: '유니패스 API 설정이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 모든 추적 정보 가져오기
    const trackings = await prisma.customsTracking.findMany()
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const tracking of trackings) {
      try {
        // BL 방식만 지원
        const apiKey = getApiKeyForRegistrationType(settings, 'BL')
        if (!apiKey) {
          failCount++
          errors.push(`${tracking.id}: 화물통관진행정보조회 API 키가 설정되지 않았습니다.`)
          continue
        }
        
        if (!tracking.blType || !tracking.blNumber || !tracking.blYear) {
          failCount++
          errors.push(`${tracking.id}: BL 정보가 올바르지 않습니다.`)
          continue
        }
        
        const apiResult = await getCargoProgress(apiKey, {
          blType: tracking.blType as 'MBL' | 'HBL',
          blNumber: tracking.blNumber,
          blYear: tracking.blYear,
        })
        
        if (!apiResult.success || !apiResult.data || apiResult.data.length === 0) {
          failCount++
          errors.push(`${tracking.id}: ${apiResult.message || '조회 실패'}`)
          continue
        }
        
        const data = apiResult.data[0]
        
        // 업데이트
        await prisma.customsTracking.update({
          where: { id: tracking.id },
          data: {
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
            lastSyncAt: new Date(),
            syncCount: tracking.syncCount + 1,
          },
        })
        
        // 통관완료 상태이고 아직 연동되지 않았으면 자동 연동
        if (isCustomsCleared(data.prgsStts) && !tracking.importId) {
          await autoLinkToImport(tracking.id)
        }
        
        successCount++
      } catch (error) {
        failCount++
        errors.push(`${tracking.id}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `전체 동기화 완료: 성공 ${successCount}건, 실패 ${failCount}건`,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error syncing all customs trackings:', error)
    return NextResponse.json(
      { error: '전체 동기화 중 오류가 발생했습니다.' },
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
    
    // 메모 생성
    const memo = generateImportLinkMemo(tracking)
    
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
