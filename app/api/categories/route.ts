import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 통합 카테고리 우선 조회, 없으면 ProductCategory 조회
    const categories = await prisma.category.findMany({
      orderBy: { code: 'asc' },
    })
    
    // 통합 카테고리가 없으면 기존 ProductCategory 반환
    if (categories.length === 0) {
      const productCategories = await prisma.productCategory.findMany({
        orderBy: { code: 'asc' },
      })
      return NextResponse.json(productCategories)
    }
    
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: '카테고리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, nameKo } = body

    const category = await prisma.category.create({
      data: {
        code,
        name,
        nameKo,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: '카테고리 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, nameKo } = body

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        nameKo,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: '카테고리 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const body = await request.json().catch(() => null)

    // Bulk delete
    if (body && body.ids && Array.isArray(body.ids)) {
      await prisma.category.deleteMany({
        where: {
          id: { in: body.ids.map((id: string | number) => parseInt(id.toString())) }
        }
      })
      return NextResponse.json({ success: true, count: body.ids.length })
    }

    // Single delete
    if (!id) {
      return NextResponse.json(
        { error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: '카테고리 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
