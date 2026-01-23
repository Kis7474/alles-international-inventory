import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCargoProgress } from '@/lib/unipass'

// GET /api/unipass/cargo-progress - 화물통관진행정보 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const blNumber = searchParams.get('blNumber')
    const blYear = searchParams.get('blYear')
    
    if (!blNumber || !blYear) {
      return NextResponse.json(
        { error: 'BL번호와 BL연도가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 설정에서 API 키 가져오기
    const settings = await prisma.systemSetting.findUnique({
      where: { key: 'unipass_settings' },
    })
    
    if (!settings?.value) {
      return NextResponse.json(
        { error: 'UNI-PASS API 설정이 필요합니다. 설정 페이지에서 API 인증키를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    let apiKey = ''
    try {
      const parsed = JSON.parse(settings.value)
      apiKey = parsed.apiKey || ''
    } catch {
      return NextResponse.json(
        { error: 'UNI-PASS 설정을 읽을 수 없습니다.' },
        { status: 500 }
      )
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 인증키가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }
    
    // API 호출 (기본적으로 MBL로 조회)
    const result = await getCargoProgress(apiKey, {
      blType: 'MBL',
      blNumber,
      blYear,
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    // 조회 결과 반환 (DB 저장은 /api/customs/tracking에서 처리)
    return NextResponse.json({
      success: true,
      data: result.data,
      message: `${result.data?.length || 0}건의 통관정보를 조회했습니다.`,
    })
  } catch (error) {
    console.error('Error fetching cargo progress:', error)
    return NextResponse.json(
      { error: '화물통관정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
