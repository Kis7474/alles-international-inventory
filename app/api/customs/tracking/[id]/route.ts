import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/customs/tracking/[id] - 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tracking = await prisma.customsTracking.findUnique({
      where: { id: params.id },
      include: {
        import: true,
      },
    })
    
    if (!tracking) {
      return NextResponse.json(
        { error: '통관 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(tracking)
  } catch (error) {
    console.error('Error fetching customs tracking:', error)
    return NextResponse.json(
      { error: '통관 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/customs/tracking/[id] - 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customsTracking.delete({
      where: { id: params.id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customs tracking:', error)
    return NextResponse.json(
      { error: '통관 정보 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
