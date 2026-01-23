import { NextRequest, NextResponse } from 'next/server'

// GET /api/unipass - 통관 정보 조회 (기존 CustomsClearance - 하위 호환성)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    interface WhereClause {
      status?: string
    }
    
    const where: WhereClause = {}
    if (status) {
      where.status = status
    }
    
    // CustomsClearance 모델이 제거되었으므로 빈 배열 반환
    // 새 시스템은 /api/customs/tracking 사용
    const clearances: never[] = []
    
    return NextResponse.json(clearances)
  } catch (error) {
    console.error('Error fetching customs clearances:', error)
    return NextResponse.json(
      { error: '통관 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/unipass - 통관 정보 삭제 (기존 CustomsClearance - 하위 호환성)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // CustomsClearance 모델이 제거되었으므로 무시
    // 새 시스템은 /api/customs/tracking 사용
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customs clearance:', error)
    return NextResponse.json(
      { error: '통관 정보 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
