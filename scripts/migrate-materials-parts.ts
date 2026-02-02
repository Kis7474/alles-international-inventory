// scripts/migrate-materials-parts.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateMaterialsAndParts() {
  console.log('🚀 Material/Part → Product 마이그레이션 시작...')
  
  try {
    // Material → Product (type: 'MATERIAL')
    const materials = await prisma.material.findMany({
      include: {
        category: true,
        purchaseVendor: true,
      },
    })
    console.log(`📦 마이그레이션할 Material: ${materials.length}개`)
    
    let materialCount = 0
    for (const mat of materials) {
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { code: mat.code },
            { name: mat.name },
          ],
        },
      })
      
      if (!existing) {
        await prisma.product.create({
          data: {
            code: mat.code || `MAT-${mat.id}`,
            name: mat.name,
            unit: mat.unit,
            type: 'MATERIAL',
            categoryId: mat.categoryId,
            purchaseVendorId: mat.purchaseVendorId,
            defaultPurchasePrice: mat.defaultPurchasePrice,
            description: mat.description,
          },
        })
        materialCount++
        console.log(`✅ Material 마이그레이션: ${mat.name}`)
      } else {
        console.log(`⏭️  Material 스킵 (이미 존재): ${mat.name}`)
      }
    }
    
    // Part → Product (type: 'PART')
    const parts = await prisma.part.findMany({
      include: {
        category: true,
        purchaseVendor: true,
      },
    })
    console.log(`📦 마이그레이션할 Part: ${parts.length}개`)
    
    let partCount = 0
    for (const part of parts) {
      const existing = await prisma.product.findFirst({
        where: {
          OR: [
            { code: part.code },
            { name: part.name },
          ],
        },
      })
      
      if (!existing) {
        await prisma.product.create({
          data: {
            code: part.code || `PART-${part.id}`,
            name: part.name,
            unit: part.unit,
            type: 'PART',
            categoryId: part.categoryId,
            purchaseVendorId: part.purchaseVendorId,
            defaultPurchasePrice: part.defaultPurchasePrice,
            description: part.description,
          },
        })
        partCount++
        console.log(`✅ Part 마이그레이션: ${part.name}`)
      } else {
        console.log(`⏭️  Part 스킵 (이미 존재): ${part.name}`)
      }
    }
    
    console.log('\n📊 마이그레이션 결과:')
    console.log(`  - Material 생성: ${materialCount}개 (전체 ${materials.length}개)`)
    console.log(`  - Part 생성: ${partCount}개 (전체 ${parts.length}개)`)
    console.log(`  - 총 생성: ${materialCount + partCount}개`)
    
    console.log('\n✨ 마이그레이션 완료!')
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error)
    throw error
  }
}

migrateMaterialsAndParts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
