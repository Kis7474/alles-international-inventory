import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getImportDeclaration } from '@/lib/unipass'

// GET /api/unipass/import-declaration - 수입신고정보 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cargoNumber = searchParams.get('cargoNumber')
    
    if (!cargoNumber) {
      return NextResponse.json(
        { error: '화물관리번호가 필요합니다.' },
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
      apiKey = parsed.apiKeyImportDeclaration || ''
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
    
    // API 호출
    const result = await getImportDeclaration(apiKey, cargoNumber)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: `${result.data?.length || 0}건의 수입신고정보를 조회했습니다.`,
    })
  } catch (error) {
    console.error('Error fetching import declaration:', error)
    return NextResponse.json(
      { error: '수입신고정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
