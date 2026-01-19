import { NextResponse } from 'next/server'
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
