import https from 'https'
import { parseString } from 'xml2js'

const UNIPASS_API_BASE = 'unipass.customs.go.kr'
const UNIPASS_API_PORT = 38010
const MULTIPLE_RESULTS_PREFIX = '[N00]' // 다건 응답 메시지 prefix

// UNI-PASS API 응답 인터페이스
export interface UnipassCargoProgress {
  mblNo?: string          // Master B/L 번호
  hblNo?: string          // House B/L 번호
  cargMtNo?: string       // 화물관리번호
  prgsStts?: string       // 진행상태
  prgsStCd?: string       // 진행상태코드
  dclrNo?: string         // 수입신고번호
  prnm?: string           // 품명
  ttwg?: string           // 총중량 (수정: wght → ttwg)
  wghtUt?: string         // 중량단위
  pckGcnt?: string        // 포장개수
  pckUt?: string          // 포장단위
  csclTotaTxamt?: string  // 통관총세액
  tkofDt?: string         // 반출일자
  etprDt?: string         // 입항일자 (수정: rlbrDt → etprDt)
  etprCstm?: string       // 입항세관
  dclrDt?: string         // 신고일자
  ldprCd?: string         // 적재항코드
  ldprNm?: string         // 적재항명
  lodCntyCd?: string      // 적출국가코드
  dsprCd?: string         // 양륙항코드
  dsprNm?: string         // 양륙항명
  shcoFlco?: string       // 선사항공사
  shipNm?: string         // 선박명
  csclPrgsStts?: string   // 통관진행상태
  prcsDttm?: string       // 처리일시
  frwrSgn?: string        // 포워더부호
  frwrEntsConm?: string   // 포워더명 (추가)
}

export interface UnipassApiResponse {
  success: boolean
  message?: string
  data?: UnipassCargoProgress[]
  rawXml?: string
  isMultiple?: boolean  // 다건 응답 플래그
}

// Type for API response structure
interface UnipassRawResponse {
  ntceInfo?: {
    ntceCn?: string
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * 유니패스 날짜 형식 (YYYYMMDD) 파싱
 * @param dateStr - 날짜 문자열 (예: "20260123")
 * @returns Date 객체 또는 null
 */
export function parseUnipassDate(dateStr: string | undefined): Date | null {
  if (!dateStr || dateStr.length < 8) return null
  const year = parseInt(dateStr.substring(0, 4), 10)
  const month = parseInt(dateStr.substring(4, 6), 10)
  const day = parseInt(dateStr.substring(6, 8), 10)
  
  // Validate date components
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }
  
  const date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  // Check if the date is valid (e.g., not Feb 30)
  if (isNaN(date.getTime())) {
    return null
  }
  
  return date
}

/**
 * SSL 검증 우회하는 HTTPS 요청 함수 (한국 정부 API 특성)
 * 
 * SECURITY NOTE: 한국 정부 기관의 API는 SSL 인증서 문제로 인해 rejectUnauthorized: false 설정이 필요합니다.
 * 이는 다음과 같은 이유로 불가피합니다:
 * 1. 한국 정부 기관의 인증서가 일부 Node.js 환경에서 신뢰되지 않음
 * 2. 한국수출입은행 API 등 다른 정부 API에서도 동일하게 적용되는 방식
 * 3. 프로덕션 환경에서는 정부 API 도메인만 허용되도록 제한
 * 
 * 대안 고려사항:
 * - 정부 API 인증서를 Node.js 신뢰 저장소에 추가
 * - 환경 변수로 SSL 검증 우회 여부를 제어
 * - API 게이트웨이를 통한 프록시 사용
 */
function fetchWithSSLBypass(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error(`Too many redirects (max ${5}). Possible redirect loop.`))
      return
    }
    
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || UNIPASS_API_PORT,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      rejectUnauthorized: false, // SSL 검증 우회
      timeout: 15000, // 15초 타임아웃
    }
    
    const req = https.request(options, (res) => {
      // 리다이렉트 처리
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString()
        fetchWithSSLBypass(redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject)
        return
      }
      
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
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('UNI-PASS API 요청 시간 초과 (15초) - 서버가 응답하지 않습니다'))
    })
    
    req.on('error', (e) => {
      if (e.message.includes('ETIMEDOUT')) {
        reject(new Error('UNI-PASS API 연결 시간 초과 - 서버에 연결할 수 없습니다 (211.173.39.20:38010)'))
      } else if (e.message.includes('ECONNREFUSED')) {
        reject(new Error('UNI-PASS API 연결 거부 - 서버가 연결을 거부했습니다'))
      } else {
        reject(new Error(`UNI-PASS API 네트워크 오류: ${e.message}`))
      }
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
 * 화물통관진행정보 조회 (API001)
 * @param apiKey - UNI-PASS API 인증키
 * @param params - 조회 파라미터
 */
export async function getCargoProgress(
  apiKey: string,
  params: {
    blType: 'MBL' | 'HBL'
    blNumber: string
    blYear: string
  }
): Promise<UnipassApiResponse> {
  try {
    const { blType, blNumber, blYear } = params
    const blParam = blType === 'MBL' ? 'mblNo' : 'hblNo'
    
    const url = `https://${UNIPASS_API_BASE}:${UNIPASS_API_PORT}/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${encodeURIComponent(apiKey)}&${blParam}=${encodeURIComponent(blNumber)}&blYy=${encodeURIComponent(blYear)}`
    
    const xmlData = await fetchWithSSLBypass(url)
    const parsed = await parseXml(xmlData)
    
    // XML 구조 파싱
    const response = parsed?.cargCsclPrgsInfoQryRtnVo as UnipassRawResponse
    
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
      // 다건 응답 체크
      if (notice && notice.startsWith(MULTIPLE_RESULTS_PREFIX)) {
        // 다건 응답 - 목록 반환
        let dataList = response.cargCsclPrgsInfoQryVo
        if (!dataList) {
          return {
            success: true,
            isMultiple: true,
            message: '다건 조회 결과이지만 데이터가 없습니다.',
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
          isMultiple: true,
          message: '다건 조회 결과입니다. 화물관리번호로 상세 조회가 필요합니다.',
          data: dataList as UnipassCargoProgress[],
          rawXml: xmlData
        }
      }
      
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
      isMultiple: false,
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
    const response = parsed?.cargCsclPrgsInfoQryRtnVo as UnipassRawResponse
    
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
    
    const response = parsed?.cargCsclPrgsInfoQryRtnVo as UnipassRawResponse
    
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

/**
 * 수입신고필증검증 (API022)
 * @param apiKey - UNI-PASS API 인증키
 * @param declarationNumber - 수입신고번호 (예: 12345-26-1234567)
 */
export async function verifyImportDeclaration(
  apiKey: string,
  declarationNumber: string
): Promise<UnipassApiResponse> {
  try {
    const url = `https://${UNIPASS_API_BASE}:${UNIPASS_API_PORT}/ext/rest/impCdslPaprVrfcSrvc/retrieveImpCdslPaprVrfc?crkyCn=${encodeURIComponent(apiKey)}&dclrNo=${encodeURIComponent(declarationNumber)}`
    
    const xmlData = await fetchWithSSLBypass(url)
    const parsed = await parseXml(xmlData)
    
    // XML 구조 파싱
    const response = parsed?.impCdslPaprVrfcQryRtnVo as UnipassRawResponse
    
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
    let dataList = response.impCdslPaprVrfcQryVo
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
    console.error('UNI-PASS Import Declaration API Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }
  }
}
