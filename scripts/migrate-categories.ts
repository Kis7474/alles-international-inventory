// scripts/migrate-categories.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCategories() {
  console.log('🚀 ProductCategory → Category 마이그레이션 시작...')
  
  try {
    const productCategories = await prisma.productCategory.findMany()
    console.log(`📦 마이그레이션할 ProductCategory: ${productCategories.length}개`)
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const pc of productCategories) {
      const existing = await prisma.category.findFirst({
        where: { 
          OR: [
            { code: pc.code },
            { nameKo: pc.nameKo },
          ]
        },
      })
      
      if (!existing) {
        await prisma.category.create({
          data: {
            code: pc.code,
            name: pc.name,
            nameKo: pc.nameKo,
          },
        })
        migratedCount++
        console.log(`✅ 카테고리 생성: ${pc.code} - ${pc.nameKo}`)
      } else {
        skippedCount++
        console.log(`⏭️  스킵 (이미 존재): ${pc.code} - ${pc.nameKo}`)
      }
    }
    
    console.log('\n📊 마이그레이션 결과:')
    console.log(`  - 신규 생성: ${migratedCount}개`)
    console.log(`  - 스킵: ${skippedCount}개`)
    console.log(`  - 총 처리: ${productCategories.length}개`)
    
    console.log('\n✨ 마이그레이션 완료!')
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error)
    throw error
  }
}

migrateCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
