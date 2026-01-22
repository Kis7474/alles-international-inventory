import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/unipass - 통관 정보 조회
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
    
    const clearances = await prisma.customsClearance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        import: true,
      },
    })
    
    return NextResponse.json(clearances)
  } catch (error) {
    console.error('Error fetching customs clearances:', error)
    return NextResponse.json(
      { error: '통관 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/unipass - 통관 정보 삭제
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
    
    await prisma.customsClearance.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customs clearance:', error)
    return NextResponse.json(
      { error: '통관 정보 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
