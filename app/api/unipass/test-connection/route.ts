import { NextRequest, NextResponse } from 'next/server'
import { testConnection } from '@/lib/unipass'

// POST /api/unipass/test-connection - API 연결 테스트
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey } = body
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 인증키가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 연결 테스트
    const result = await testConnection(apiKey)
    
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
