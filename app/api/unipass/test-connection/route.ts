import { NextRequest, NextResponse } from 'next/server'
import { testConnection, getCargoProgress, verifyImportDeclaration } from '@/lib/unipass'
import { isAuthenticationError } from '@/lib/unipass-helpers'

// POST /api/unipass/test-connection - API 연결 테스트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey, apiType } = body
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 인증키가 필요합니다.' },
        { status: 400 }
      )
    }
    
    let result
    
    if (apiType === 'CARGO_PROGRESS') {
      // API001 테스트 - 화물통관진행정보조회
      result = await getCargoProgress(apiKey, {
        blType: 'MBL',
        blNumber: 'TEST',
        blYear: '2024',
      })
      
      // 인증 오류가 아니면 연결 성공으로 간주
      if (result.success || !isAuthenticationError(result.message)) {
        return NextResponse.json({
          success: true,
          message: '화물통관진행정보조회 API 연결 성공',
        })
      }
    } else if (apiType === 'IMPORT_DECLARATION') {
      // API022 테스트 - 수입신고필증검증
      result = await verifyImportDeclaration(apiKey, '00000-00-0000000')
      
      // 인증 오류가 아니면 연결 성공으로 간주
      if (result.success || !isAuthenticationError(result.message)) {
        return NextResponse.json({
          success: true,
          message: '수입신고필증검증 API 연결 성공',
        })
      }
    } else {
      // apiType이 없으면 기존 방식으로 테스트
      result = await testConnection(apiKey)
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
    })
  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      { error: '연결 테스트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
