import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress, verifyImportDeclaration } from '@/lib/unipass'

// POST /api/customs/tracking/sync-all - 전체 동기화
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  try {
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
    
    // 모든 추적 정보 가져오기
    const trackings = await prisma.customsTracking.findMany()
    
    let successCount = 0
    let failCount = 0
    const errors: string[] = []
    
    for (const tracking of trackings) {
      try {
        let apiResult
        
        if (tracking.registrationType === 'BL') {
          if (!tracking.blType || !tracking.blNumber || !tracking.blYear) {
            failCount++
            errors.push(`${tracking.id}: BL 정보가 올바르지 않습니다.`)
            continue
          }
          
          apiResult = await getCargoProgress(apiKey, {
            blType: tracking.blType as 'MBL' | 'HBL',
            blNumber: tracking.blNumber,
            blYear: tracking.blYear,
          })
        } else if (tracking.registrationType === 'DECLARATION') {
          if (!tracking.declarationNumber) {
            failCount++
            errors.push(`${tracking.id}: 수입신고번호가 올바르지 않습니다.`)
            continue
          }
          
          apiResult = await verifyImportDeclaration(apiKey, tracking.declarationNumber)
        } else {
          failCount++
          errors.push(`${tracking.id}: 올바른 등록 방식이 아닙니다.`)
          continue
        }
        
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
            weight: data.wght ? parseFloat(data.wght) : null,
            arrivalDate: data.rlbrDt ? new Date(data.rlbrDt) : null,
            declarationDate: data.dclrDt ? new Date(data.dclrDt) : null,
            clearanceDate: data.tkofDt ? new Date(data.tkofDt) : null,
            customsDuty: data.csclTotaTxamt ? parseFloat(data.csclTotaTxamt) : null,
            totalTax: data.csclTotaTxamt ? parseFloat(data.csclTotaTxamt) : null,
            rawData: JSON.stringify(data),
            lastSyncAt: new Date(),
            syncCount: tracking.syncCount + 1,
          },
        })
        
        // 통관완료 상태이고 아직 연동되지 않았으면 자동 연동
        if ((data.prgsStts === '통관완료' || data.prgsStts === '수입신고수리') && !tracking.importId) {
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
