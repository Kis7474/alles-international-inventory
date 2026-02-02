import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import https from 'https'
import { isProxyEnabled, fetchThroughProxy } from '@/lib/api-proxy'

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

// 리다이렉트를 처리하는 HTTPS 요청 함수 (15초 타임아웃 적용)
// 프록시 서버가 설정되어 있으면 프록시를 통해 요청, 아니면 직접 요청 (폴백)
async function fetchWithSSLBypass(url: string, maxRedirects = 5): Promise<KoreaEximRate[]> {
  // 프록시 서버를 통한 요청 (Railway 프록시)
  if (isProxyEnabled()) {
    try {
      const data = await fetchThroughProxy(url)
      const parsed = JSON.parse(data)
      
      // API 응답 검증
      if (!Array.isArray(parsed)) {
        throw new Error('API 응답 형식이 올바르지 않습니다')
      }
      
      return parsed
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          throw new Error('JSON 파싱 실패 - API 응답이 올바른 JSON 형식이 아닙니다')
        }
        throw error
      }
      throw new Error('프록시를 통한 API 호출 중 오류가 발생했습니다')
    }
  }
  
  // 폴백: 기존 직접 호출 방식 (프록시 미설정 시)
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error('너무 많은 리다이렉트'))
      return
    }
    
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      rejectUnauthorized: false, // SSL 검증 우회
      timeout: 15000, // 15초 타임아웃
    }
    
    const req = https.request(options, (res) => {
      // 리다이렉트 처리 (301, 302, 303, 307, 308)
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url)
        
        // HTTPS 프로토콜만 허용 (보안)
        if (redirectUrl.protocol !== 'https:') {
          reject(new Error('안전하지 않은 리다이렉트'))
          return
        }
        
        fetchWithSSLBypass(redirectUrl.toString(), maxRedirects - 1)
          .then(resolve)
          .catch(reject)
        return
      }
      
      // 에러 상태 코드 처리
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
        reject(new Error(`API 응답 오류: ${res.statusCode} - 한국수출입은행 API 서버 오류`))
        return
      }
      
      let data = ''
      res.setEncoding('utf8')
      
      res.on('data', (chunk: string) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          // API 응답 검증
          if (!Array.isArray(parsed)) {
            reject(new Error('API 응답 형식이 올바르지 않습니다'))
            return
          }
          resolve(parsed)
        } catch {
          reject(new Error('JSON 파싱 실패 - API 응답이 올바른 JSON 형식이 아닙니다'))
        }
      })
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('API 요청 시간 초과 (15초) - 한국수출입은행 서버가 응답하지 않습니다'))
    })
    
    req.on('error', (e) => {
      if (e.message.includes('ETIMEDOUT')) {
        reject(new Error('네트워크 연결 시간 초과 - 한국수출입은행 서버에 연결할 수 없습니다'))
      } else if (e.message.includes('ECONNREFUSED')) {
        reject(new Error('연결 거부됨 - 한국수출입은행 서버가 연결을 거부했습니다'))
      } else {
        reject(new Error(`네트워크 오류: ${e.message}`))
      }
    })
    
    req.end()
  })
}

// GET /api/exchange-rates/by-date - 특정 날짜의 환율 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const date = searchParams.get('date')
    
    if (!currency || !date) {
      return NextResponse.json({ 
        success: false,
        error: '통화와 날짜를 모두 입력해주세요.' 
      }, { status: 400 })
    }
    
    // KRW는 환율이 1
    if (currency === 'KRW') {
      return NextResponse.json({
        success: true,
        rate: 1,
        currency: 'KRW',
        date: date,
        source: 'DEFAULT'
      })
    }
    
    // 날짜를 Date 객체로 변환 (시간은 00:00:00)
    const dateObj = new Date(date + 'T00:00:00.000Z')
    
    // 먼저 DB에서 조회
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        date_currency: {
          currency,
          date: dateObj,
        },
      },
    })
    
    if (existingRate) {
      return NextResponse.json({
        success: true,
        rate: existingRate.rate,
        currency: existingRate.currency,
        date: existingRate.date.toISOString().split('T')[0],
        source: existingRate.source
      })
    }
    
    // DB에 없으면 API에서 조회
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
      // API 키가 없으면 기본값 반환
      const defaultRates: Record<string, number> = {
        'USD': 1350,
        'EUR': 1450,
        'JPY': 9,
        'CNY': 185,
        'GBP': 1700,
      }
      
      return NextResponse.json({ 
        success: true,
        rate: defaultRates[currency] || 1,
        currency,
        date,
        source: 'default',
        message: '환율 데이터가 없어 기본값을 사용합니다. 환율 관리에서 정확한 환율을 등록해주세요.'
      })
    }
    
    // 한국수출입은행 API 호출 (최대 7일 전까지 시도)
    let data: KoreaEximRate[] | null = null
    let actualDate = dateObj
    
    for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
      const targetDate = new Date(dateObj)
      targetDate.setDate(targetDate.getDate() - daysAgo)
      const targetDateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '')
      
      try {
        const apiData = await fetchWithSSLBypass(
          `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${targetDateStr}&data=AP01`
        )
        
        // API 결과 확인
        if (apiData && Array.isArray(apiData) && apiData.length > 0 && apiData[0]?.result !== 4) {
          data = apiData
          actualDate = targetDate
          break
        }
      } catch (error) {
        console.error(`Failed to fetch exchange rate for ${targetDateStr}:`, error)
        // 첫 번째 시도에서 실패하면 에러 반환
        if (daysAgo === 0) {
          throw error
        }
      }
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      // API에서 데이터를 가져오지 못한 경우 기본값 반환
      const defaultRates: Record<string, number> = {
        'USD': 1350,
        'EUR': 1450,
        'JPY': 9,
        'CNY': 185,
        'GBP': 1700,
      }
      
      return NextResponse.json({ 
        success: true,
        rate: defaultRates[currency] || 1,
        currency,
        date,
        source: 'default',
        message: '환율 데이터를 가져올 수 없어 기본값을 사용합니다. 환율 관리에서 정확한 환율을 등록해주세요.'
      })
    }
    
    // 요청한 통화 찾기
    const targetCurrency = currency === 'CNY' ? 'CNH' : currency === 'JPY' ? 'JPY(100)' : currency
    const rateData = data.find(item => item.cur_unit === targetCurrency)
    
    if (!rateData) {
      // 해당 통화를 찾지 못한 경우 기본값 반환
      const defaultRates: Record<string, number> = {
        'USD': 1350,
        'EUR': 1450,
        'JPY': 9,
        'CNY': 185,
        'GBP': 1700,
      }
      
      return NextResponse.json({ 
        success: true,
        rate: defaultRates[currency] || 1,
        currency,
        date,
        source: 'default',
        message: `${currency} 통화의 환율 정보를 찾을 수 없어 기본값을 사용합니다.`
      })
    }
    
    // 매매기준율 파싱 (쉼표 제거)
    const rate = parseFloat(rateData.deal_bas_r?.replace(/,/g, '')) || 0
    if (rate <= 0) {
      // 유효하지 않은 환율인 경우 기본값 반환
      const defaultRates: Record<string, number> = {
        'USD': 1350,
        'EUR': 1450,
        'JPY': 9,
        'CNY': 185,
        'GBP': 1700,
      }
      
      return NextResponse.json({ 
        success: true,
        rate: defaultRates[currency] || 1,
        currency,
        date,
        source: 'default',
        message: '유효한 환율 정보를 찾을 수 없어 기본값을 사용합니다.'
      })
    }
    
    // JPY는 100엔 기준이므로 1엔 단위로 변환
    const finalRate = targetCurrency === 'JPY(100)' ? rate / 100 : rate
    
    // DB에 저장 (시간은 00:00:00)
    const savedRate = await prisma.exchangeRate.upsert({
      where: {
        date_currency: {
          currency,
          date: actualDate,
        },
      },
      update: {
        rate: finalRate,
        source: 'KOREAEXIM',
      },
      create: {
        currency,
        date: actualDate,
        rate: finalRate,
        source: 'KOREAEXIM',
      },
    })
    
    return NextResponse.json({
      success: true,
      rate: savedRate.rate,
      currency: savedRate.currency,
      date: savedRate.date.toISOString().split('T')[0],
      source: savedRate.source
    })
    
  } catch (error) {
    console.error('Exchange rate by-date error:', error)
    
    // 에러 발생 시에도 기본값 제공
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const date = searchParams.get('date')
    
    if (currency && date) {
      const defaultRates: Record<string, number> = {
        'USD': 1350,
        'EUR': 1450,
        'JPY': 9,
        'CNY': 185,
        'GBP': 1700,
      }
      
      return NextResponse.json({ 
        success: true,
        rate: defaultRates[currency] || 1,
        currency,
        date,
        source: 'default',
        message: '환율 조회 중 오류가 발생하여 기본값을 사용합니다. 환율 관리에서 정확한 환율을 등록해주세요.'
      })
    }
    
    // 에러 메시지를 더 자세히 제공
    let errorMessage = '환율 조회 중 오류가 발생했습니다.'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // 타임아웃 관련 에러는 504로 처리
      if (error.message.includes('시간 초과') || error.message.includes('ETIMEDOUT')) {
        statusCode = 504
      }
      // 네트워크 연결 오류는 503으로 처리
      else if (error.message.includes('연결') || error.message.includes('ECONNREFUSED')) {
        statusCode = 503
      }
      // API 응답 오류는 502로 처리
      else if (error.message.includes('API 응답 오류')) {
        statusCode = 502
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}
