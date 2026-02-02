// scripts/migrate-items-to-products.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateItemsToProducts() {
  console.log('🚀 Item → Product 마이그레이션 시작...')
  
  try {
    // 1. 기존 Item 데이터 조회
    const items = await prisma.item.findMany()
    console.log(`📦 마이그레이션할 Item: ${items.length}개`)
    
    // 2. 기본 매입처 확인/생성
    let defaultVendor = await prisma.vendor.findFirst({
      where: { code: 'DEFAULT_PURCHASE' },
    })
    
    if (!defaultVendor) {
      defaultVendor = await prisma.vendor.create({
        data: {
          code: 'DEFAULT_PURCHASE',
          name: '기본 매입처',
          type: 'DOMESTIC_PURCHASE',
          currency: 'KRW',
        },
      })
      console.log('✅ 기본 매입처 생성됨')
    }
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const item of items) {
      // 3. 이미 같은 이름의 Product가 있는지 확인
      const existingProduct = await prisma.product.findFirst({
        where: { 
          OR: [
            { code: item.code },
            { name: item.name },
          ]
        },
      })
      
      if (existingProduct) {
        // 4-A. 기존 Product가 있으면 Item의 관계를 Product로 업데이트
        await prisma.inventoryLot.updateMany({
          where: { itemId: item.id },
          data: { productId: existingProduct.id },
        })
        
        skippedCount++
        console.log(`⏭️  스킵 (기존 Product 사용): ${item.code} - ${item.name}`)
      } else {
        // 4-B. 새 Product 생성
        const newProduct = await prisma.product.create({
          data: {
            code: item.code,
            name: item.name,
            unit: item.unit,
            description: item.note,
            type: 'PRODUCT',
            purchaseVendorId: defaultVendor.id,
          },
        })
        
        // 5. InventoryLot의 itemId를 productId로 업데이트
        await prisma.inventoryLot.updateMany({
          where: { itemId: item.id },
          data: { productId: newProduct.id },
        })
        
        migratedCount++
        console.log(`✅ 마이그레이션 완료: ${item.code} - ${item.name} → Product ID: ${newProduct.id}`)
      }
    }
    
    console.log('\n📊 마이그레이션 결과:')
    console.log(`  - 신규 생성: ${migratedCount}개`)
    console.log(`  - 기존 연결: ${skippedCount}개`)
    console.log(`  - 총 처리: ${items.length}개`)
    
    // 6. 마이그레이션 검증
    const orphanLots = await prisma.inventoryLot.count({
      where: {
        productId: null,
        itemId: { not: null },
      },
    })
    
    if (orphanLots > 0) {
      console.log(`⚠️  경고: productId가 없는 LOT이 ${orphanLots}개 있습니다.`)
    } else {
      console.log('✅ 모든 LOT이 Product에 연결되었습니다.')
    }
    
    console.log('\n✨ 마이그레이션 완료!')
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error)
    throw error
  }
}

migrateItemsToProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
