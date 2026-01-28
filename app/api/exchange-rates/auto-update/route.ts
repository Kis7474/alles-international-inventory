import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import https from 'https'
import { proxyFetch, isProxyConfigured } from '@/lib/api-proxy'

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
function fetchWithSSLBypass(url: string, maxRedirects = 5): Promise<KoreaEximRate[]> {
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

/**
 * Fetch exchange rate data with proxy support
 * @param url - API URL to fetch
 * @returns Parsed exchange rate data
 */
async function fetchExchangeRates(url: string): Promise<KoreaEximRate[]> {
  // Try proxy first if configured
  if (isProxyConfigured()) {
    try {
      console.log('Using Cloudflare Workers proxy for Korea Eximbank API')
      const data = await proxyFetch(url, { timeout: 15000 })
      const parsed = JSON.parse(data)
      
      if (!Array.isArray(parsed)) {
        throw new Error('API 응답 형식이 올바르지 않습니다')
      }
      
      return parsed
    } catch (error) {
      // If proxy fails, fall back to direct fetch
      if (error instanceof Error && error.message !== 'PROXY_NOT_CONFIGURED') {
        console.warn('Proxy fetch failed, falling back to direct fetch:', error.message)
      }
    }
  }
  
  // Direct fetch (fallback)
  console.log('Using direct fetch for Korea Eximbank API')
  return await fetchWithSSLBypass(url)
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
    let data: KoreaEximRate[] = await fetchExchangeRates(
      `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`
    )
    
    // API 결과 확인 (결과가 없으면 전날 데이터 조회)
    if (!data || !Array.isArray(data) || data.length === 0 || (data[0]?.result === 4)) {
      // 주말이나 공휴일인 경우 전날 데이터 시도 (최대 3일 전까지)
      for (let daysAgo = 1; daysAgo <= 3; daysAgo++) {
        const pastDate = new Date(today)
        pastDate.setDate(pastDate.getDate() - daysAgo)
        const pastDateStr = pastDate.toISOString().slice(0, 10).replace(/-/g, '')
        
        const retryData = await fetchExchangeRates(
          `${KOREAEXIM_API_URL}?authkey=${apiKey}&searchdate=${pastDateStr}&data=AP01`
        )
        
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
    
    // 에러 메시지를 더 자세히 제공
    let errorMessage = '환율 업데이트 중 오류가 발생했습니다.'
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
