import https from 'https'
import { parseString } from 'xml2js'

const UNIPASS_API_BASE = 'unipass.customs.go.kr'
const UNIPASS_API_PORT = 38010

// UNI-PASS API 응답 인터페이스
export interface UnipassCargoProgress {
  mblNo?: string          // Master B/L 번호
  hblNo?: string          // House B/L 번호
  cargMtNo?: string       // 화물관리번호
  prgsStts?: string       // 진행상태
  dclrNo?: string         // 수입신고번호
  prnm?: string           // 품명
  wght?: string           // 중량
  csclTotaTxamt?: string  // 통관총세액
  tkofDt?: string         // 반출일자
  rlbrDt?: string         // 입항일자
  dclrDt?: string         // 신고일자
}

export interface UnipassApiResponse {
  success: boolean
  message?: string
  data?: UnipassCargoProgress[]
  rawXml?: string
}

/**
 * SSL 검증 우회하는 HTTPS 요청 함수 (한국 정부 API 특성)
 */
function fetchWithSSLBypass(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || UNIPASS_API_PORT,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      rejectUnauthorized: false, // SSL 검증 우회
    }
    
    const req = https.request(options, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 400) {
        reject(new Error(`API 응답 오류: ${res.statusCode}`))
        return
      }
      
      let data = ''
      res.setEncoding('utf8')
      
      res.on('data', (chunk: string) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve(data)
      })
    })
    
    req.on('error', (e) => {
      reject(e)
    })
    
    req.end()
  })
}

/**
 * XML을 JSON으로 파싱
 */
function parseXml(xml: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false, mergeAttrs: true }, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

/**
 * 화물통관진행정보 조회
 * @param apiKey - UNI-PASS API 인증키
 * @param blNumber - B/L 번호
 * @param blYear - B/L 연도 (YYYY)
 */
export async function getCargoProgress(
  apiKey: string,
  blNumber: string,
  blYear: string
): Promise<UnipassApiResponse> {
  try {
    const url = `https://${UNIPASS_API_BASE}:${UNIPASS_API_PORT}/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${encodeURIComponent(apiKey)}&mblNo=${encodeURIComponent(blNumber)}&blYy=${encodeURIComponent(blYear)}`
    
    const xmlData = await fetchWithSSLBypass(url)
    const parsed = await parseXml(xmlData)
    
    // XML 구조 파싱
    const response = parsed?.cargCsclPrgsInfoQryRtnVo
    
    if (!response) {
      return {
        success: false,
        message: 'API 응답 형식이 올바르지 않습니다.',
        rawXml: xmlData
      }
    }
    
    // 에러 체크
    const notice = response.ntceInfo?.ntceCn
    if (notice && notice !== '정상처리되었습니다.') {
      return {
        success: false,
        message: notice,
        rawXml: xmlData
      }
    }
    
    // 데이터 추출
    let dataList = response.cargCsclPrgsInfoQryVo
    if (!dataList) {
      return {
        success: true,
        message: '조회 결과가 없습니다.',
        data: [],
        rawXml: xmlData
      }
    }
    
    // 단일 결과를 배열로 변환
    if (!Array.isArray(dataList)) {
      dataList = [dataList]
    }
    
    return {
      success: true,
      data: dataList as UnipassCargoProgress[],
      rawXml: xmlData
    }
  } catch (error) {
    console.error('UNI-PASS API Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * 화물관리번호로 수입신고정보 조회
 * @param apiKey - UNI-PASS API 인증키
 * @param cargoNumber - 화물관리번호
 */
export async function getImportDeclaration(
  apiKey: string,
  cargoNumber: string
): Promise<UnipassApiResponse> {
  try {
    const url = `https://${UNIPASS_API_BASE}:${UNIPASS_API_PORT}/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${encodeURIComponent(apiKey)}&cargMtNo=${encodeURIComponent(cargoNumber)}`
    
    const xmlData = await fetchWithSSLBypass(url)
    const parsed = await parseXml(xmlData)
    
    // XML 구조 파싱
    const response = parsed?.cargCsclPrgsInfoQryRtnVo
    
    if (!response) {
      return {
        success: false,
        message: 'API 응답 형식이 올바르지 않습니다.',
        rawXml: xmlData
      }
    }
    
    // 에러 체크
    const notice = response.ntceInfo?.ntceCn
    if (notice && notice !== '정상처리되었습니다.') {
      return {
        success: false,
        message: notice,
        rawXml: xmlData
      }
    }
    
    // 데이터 추출
    let dataList = response.cargCsclPrgsInfoQryVo
    if (!dataList) {
      return {
        success: true,
        message: '조회 결과가 없습니다.',
        data: [],
        rawXml: xmlData
      }
    }
    
    // 단일 결과를 배열로 변환
    if (!Array.isArray(dataList)) {
      dataList = [dataList]
    }
    
    return {
      success: true,
      data: dataList as UnipassCargoProgress[],
      rawXml: xmlData
    }
  } catch (error) {
    console.error('UNI-PASS API Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}

/**
 * API 연결 테스트
 * @param apiKey - UNI-PASS API 인증키
 */
export async function testConnection(apiKey: string): Promise<UnipassApiResponse> {
  try {
    // 테스트용 더미 BL 번호로 조회 시도 (응답 형식 확인용)
    const url = `https://${UNIPASS_API_BASE}:${UNIPASS_API_PORT}/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${encodeURIComponent(apiKey)}&mblNo=TEST&blYy=2024`
    
    const xmlData = await fetchWithSSLBypass(url)
    const parsed = await parseXml(xmlData)
    
    const response = parsed?.cargCsclPrgsInfoQryRtnVo
    
    if (!response) {
      return {
        success: false,
        message: 'API 응답 형식이 올바르지 않습니다.',
        rawXml: xmlData
      }
    }
    
    // 인증 오류가 아니면 연결 성공
    const notice = response.ntceInfo?.ntceCn
    
    // 인증 실패 메시지 체크
    if (notice && (notice.includes('인증') || notice.includes('키') || notice.includes('권한'))) {
      return {
        success: false,
        message: '인증키가 유효하지 않습니다.',
        rawXml: xmlData
      }
    }
    
    return {
      success: true,
      message: 'API 연결이 정상적으로 작동합니다.',
      rawXml: xmlData
    }
  } catch (error) {
    console.error('UNI-PASS Connection Test Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '연결 테스트 중 오류가 발생했습니다.'
    }
  }
}
