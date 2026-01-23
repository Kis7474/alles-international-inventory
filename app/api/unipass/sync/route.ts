import { NextRequest, NextResponse } from 'next/server'

// POST /api/unipass/sync - 통관 완료 건 자동 동기화 (기존 CustomsClearance - 하위 호환성)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clearanceId } = body
    
    if (!clearanceId) {
      return NextResponse.json(
        { error: '통관 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // CustomsClearance 모델이 제거되었으므로 에러 반환
    // 새 시스템은 /api/customs/tracking/[id]/sync 사용
    return NextResponse.json(
      { error: '이 API는 더 이상 사용되지 않습니다. /customs/tracking 페이지를 사용해주세요.' },
      { status: 410 }
    )
  } catch (error) {
    console.error('Error syncing customs clearance:', error)
    return NextResponse.json(
      { error: '동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
