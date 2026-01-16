import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 품목 목록 조회
export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: '품목 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 품목 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, unit, note } = body

    // 유효성 검사
    if (!code || !name || !unit) {
      return NextResponse.json(
        { error: '코드, 이름, 단위는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    // 중복 코드 확인
    const existing = await prisma.item.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json(
        { error: '이미 존재하는 품목 코드입니다.' },
        { status: 409 }
      )
    }

    const item = await prisma.item.create({
      data: { code, name, unit, note },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: '품목 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 품목 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, unit, note } = body

    if (!id) {
      return NextResponse.json(
        { error: '품목 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 코드 중복 확인 (자신 제외)
    if (code) {
      const existing = await prisma.item.findFirst({
        where: {
          code,
          NOT: { id },
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: '이미 존재하는 품목 코드입니다.' },
          { status: 409 }
        )
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: { code, name, unit, note },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: '품목 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 품목 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: '품목 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 관련 LOT 확인
    const lots = await prisma.inventoryLot.findMany({
      where: { itemId: parseInt(id) },
    })

    if (lots.length > 0) {
      return NextResponse.json(
        { error: '입고 이력이 있는 품목은 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    await prisma.item.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: '품목 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
