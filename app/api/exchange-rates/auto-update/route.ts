import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 한국수출입은행 환율 API
const KOREAEXIM_API_URL = 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON'

interface KoreaEximRate {
  result?: number
  cur_unit: string
  cur_nm: string
  ttb: string
  tts: string
  deal_bas_r: string
  bkpr: string
  yy_efee_r: string
  ten_dd_efee_r: string
  kftc_deal_bas_r: string
  kftc_bkpr: string
}

// POST /api/exchange-rates/auto-update - 환율 자동 업데이트
export async function POST() {
  try {
    // 설정에서 API 키 가져오기
    const settings = await prisma.systemSetting.findUnique({
      where: { key: 'exchange_rate_settings' },
    })
    
    let apiKey = process.env.KOREAEXIM_API_KEY || ''
    if (settings?.value) {
      try {
        const parsed = JSON.parse(settings.value)
        apiKey = parsed.koreaexim_api_key || parsed.koreaeximApiKey || apiKey
      } catch {
        console.warn('Failed to parse exchange rate settings')
      }
    }
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API 키가 설정되지 않았습니다. 환율 설정에서 한국수출입은행 API 키를 입력해주세요.' 
      }, { status: 400 })
    }
    
    // 오늘 날짜 (YYYYMMDD 형식)
    const today = new Date()
    const searchDate = today.toISOString().slice(0, 10).replace(/-/g, '')
    
    // 한국수출입은행 API 호출
    const response = await fetch(
      `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`)
    }
    
    let data: KoreaEximRate[] = await response.json()
    
    // API 결과 확인 (결과가 없으면 전날 데이터 조회)
    if (!data || !Array.isArray(data) || data.length === 0 || (data[0]?.result === 4)) {
      // 주말이나 공휴일인 경우 전날 데이터 시도 (최대 3일 전까지)
      for (let daysAgo = 1; daysAgo <= 3; daysAgo++) {
        const pastDate = new Date(today)
        pastDate.setDate(pastDate.getDate() - daysAgo)
        const pastDateStr = pastDate.toISOString().slice(0, 10).replace(/-/g, '')
        
        const retryResponse = await fetch(
          `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${pastDateStr}&data=AP01`
        )
        const retryData = await retryResponse.json()
        
        if (retryData && Array.isArray(retryData) && retryData.length > 0 && retryData[0]?.result !== 4) {
          data = retryData
          break
        }
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: '환율 데이터를 가져올 수 없습니다. 주말이나 공휴일일 수 있습니다.' 
        }, { status: 400 })
      }
    }
    
    // 환율 데이터 저장
    const targetCurrencies = ['USD', 'EUR', 'JPY(100)', 'CNH', 'GBP']
    let updatedCount = 0
    
    for (const item of data) {
      // 통화 코드 매핑
      let currency = item.cur_unit
      if (currency === 'JPY(100)') currency = 'JPY'
      if (currency === 'CNH') currency = 'CNY'
      
      if (!targetCurrencies.some(c => c === item.cur_unit || c === currency)) {
        continue
      }
      
      // 매매기준율 파싱 (쉼표 제거)
      const rate = parseFloat(item.deal_bas_r?.replace(/,/g, '')) || 0
      if (rate <= 0) continue
      
      // JPY는 100엔 기준이므로 1엔 단위로 변환
      const finalRate = item.cur_unit === 'JPY(100)' ? rate / 100 : rate
      
      // 데이터베이스에 저장/업데이트 (오늘 날짜 기준, 시간은 00:00:00)
      const dateOnly = new Date(today.toISOString().split('T')[0])
      
      await prisma.exchangeRate.upsert({
        where: {
          date_currency: {
            currency,
            date: dateOnly,
          },
        },
        update: {
          rate: finalRate,
          source: 'KOREAEXIM',
        },
        create: {
          currency,
          date: dateOnly,
          rate: finalRate,
          source: 'KOREAEXIM',
        },
      })
      
      updatedCount++
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `환율이 업데이트되었습니다. (${updatedCount}개 통화)`,
      updatedCount,
      updatedAt: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Exchange rate update error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : '환율 업데이트 중 오류가 발생했습니다.' 
    }, { status: 500 })
  }
}
