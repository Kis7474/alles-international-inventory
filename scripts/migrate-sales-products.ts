// scripts/migrate-sales-products.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateSalesProductsToProducts() {
  console.log('🚀 SalesProduct → Product 마이그레이션 시작...')
  
  try {
    const salesProducts = await prisma.salesProduct.findMany({
      include: { prices: true },
    })
    console.log(`📦 마이그레이션할 SalesProduct: ${salesProducts.length}개`)
    
    // 기본 매입처 확인/생성
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
    
    for (const sp of salesProducts) {
      // 같은 이름의 Product가 있는지 확인
      const existingProduct = await prisma.product.findFirst({
        where: { name: sp.name },
      })
      
      if (existingProduct) {
        // 기존 Product에 가격 정보 업데이트
        const latestPrice = sp.prices[0]
        if (latestPrice) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              defaultPurchasePrice: latestPrice.purchasePrice,
              defaultSalesPrice: latestPrice.salesPrice,
            },
          })
          
          // 가격 이력 마이그레이션
          for (const price of sp.prices) {
            // 중복 체크
            const existingHistory = await prisma.productPriceHistory.findFirst({
              where: {
                productId: existingProduct.id,
                effectiveDate: price.effectiveDate,
              },
            })
            
            if (!existingHistory) {
              await prisma.productPriceHistory.create({
                data: {
                  productId: existingProduct.id,
                  effectiveDate: price.effectiveDate,
                  purchasePrice: price.purchasePrice,
                  salesPrice: price.salesPrice,
                  notes: price.notes,
                },
              })
            }
          }
        }
        
        // SalesRecord 업데이트
        await prisma.salesRecord.updateMany({
          where: { salesProductId: sp.id },
          data: { productId: existingProduct.id },
        })
        
        skippedCount++
        console.log(`⏭️  스킵 (기존 Product 사용): ${sp.name}`)
      } else {
        // 새 Product 생성
        const latestPrice = sp.prices[0]
        const newProduct = await prisma.product.create({
          data: {
            code: `SP-${sp.id}`,
            name: sp.name,
            unit: sp.unit,
            description: sp.description,
            type: 'PRODUCT',
            purchaseVendorId: defaultVendor.id,
            defaultPurchasePrice: latestPrice?.purchasePrice || 0,
            defaultSalesPrice: latestPrice?.salesPrice || 0,
          },
        })
        
        // 가격 이력 마이그레이션
        for (const price of sp.prices) {
          await prisma.productPriceHistory.create({
            data: {
              productId: newProduct.id,
              effectiveDate: price.effectiveDate,
              purchasePrice: price.purchasePrice,
              salesPrice: price.salesPrice,
              notes: price.notes,
            },
          })
        }
        
        // SalesRecord 업데이트
        await prisma.salesRecord.updateMany({
          where: { salesProductId: sp.id },
          data: { productId: newProduct.id },
        })
        
        migratedCount++
        console.log(`✅ 마이그레이션 완료: ${sp.name} → Product ID: ${newProduct.id}`)
      }
    }
    
    console.log('\n📊 마이그레이션 결과:')
    console.log(`  - 신규 생성: ${migratedCount}개`)
    console.log(`  - 기존 연결: ${skippedCount}개`)
    console.log(`  - 총 처리: ${salesProducts.length}개`)
    
    console.log('\n✨ 마이그레이션 완료!')
  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error)
    throw error
  }
}

migrateSalesProductsToProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
