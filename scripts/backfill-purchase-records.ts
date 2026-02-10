/**
 * 기존 수입등록 데이터에 대해 매입 레코드를 소급 생성하는 스크립트
 * 
 * 실행 방법:
 *   npx tsx scripts/backfill-purchase-records.ts
 *   또는
 *   npx ts-node scripts/backfill-purchase-records.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting backfill of purchase records from import registrations...\n')

  try {
    // 1. 모든 수입등록 조회 (type='IMPORT')
    const importRecords = await prisma.importExport.findMany({
      where: { type: 'IMPORT' },
      include: {
        product: {
          include: {
            category: true,
          }
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
              }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    console.log(`Found ${importRecords.length} import records to process\n`)

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const importRecord of importRecords) {
      try {
        // 2. 이미 매입 레코드가 있는지 확인
        const existingPurchase = await prisma.salesRecord.findFirst({
          where: {
            importExportId: importRecord.id,
            costSource: 'IMPORT_AUTO',
          }
        })

        if (existingPurchase) {
          console.log(`⏭️  Skipping import ${importRecord.id}: Purchase record already exists`)
          skippedCount++
          continue
        }

        // 3. 매입 레코드 생성
        const isMultiItem = importRecord.items.length > 0
        
        if (isMultiItem) {
          // 다중 품목: 각 품목마다 개별 매입 레코드 생성
          const totalQuantity = importRecord.items.reduce((sum, item) => sum + item.quantity, 0)
          const totalAdditionalCosts = (importRecord.dutyAmount || 0) + (importRecord.shippingCost || 0) + (importRecord.otherCost || 0)
          const additionalCostPerUnit = totalQuantity > 0 ? totalAdditionalCosts / totalQuantity : 0

          for (const item of importRecord.items) {
            const itemUnitCost = (item.unitPrice * importRecord.exchangeRate) + additionalCostPerUnit
            
            await prisma.salesRecord.create({
              data: {
                date: importRecord.date,
                type: 'PURCHASE',
                salespersonId: importRecord.salespersonId || 1, // 기본 담당자 ID=1
                categoryId: item.product.categoryId || 1, // 기본 카테고리 ID=1
                productId: item.productId,
                vendorId: importRecord.vendorId,
                itemName: item.product.name,
                quantity: item.quantity,
                unitPrice: itemUnitCost,
                amount: item.quantity * itemUnitCost,
                cost: 0,
                margin: 0,
                marginRate: 0,
                costSource: 'IMPORT_AUTO',
                importExportId: importRecord.id,
                notes: `수입등록 ${importRecord.id}에서 자동생성 (소급)`,
              }
            })
            
            console.log(`✅ Created purchase record for import ${importRecord.id}, product ${item.product.name}`)
            createdCount++
          }
        } else if (importRecord.productId && importRecord.unitCost) {
          // 단일 품목: 하나의 매입 레코드 생성
          const product = importRecord.product
          
          if (!product) {
            console.log(`⚠️  Warning: Import ${importRecord.id} has no product`)
            errorCount++
            continue
          }

          await prisma.salesRecord.create({
            data: {
              date: importRecord.date,
              type: 'PURCHASE',
              salespersonId: importRecord.salespersonId || 1, // 기본 담당자 ID=1
              categoryId: product.categoryId || 1, // 기본 카테고리 ID=1
              productId: product.id,
              vendorId: importRecord.vendorId,
              itemName: product.name,
              quantity: importRecord.quantity || 0,
              unitPrice: importRecord.unitCost,
              amount: (importRecord.quantity || 0) * importRecord.unitCost,
              cost: 0,
              margin: 0,
              marginRate: 0,
              costSource: 'IMPORT_AUTO',
              importExportId: importRecord.id,
              notes: `수입등록 ${importRecord.id}에서 자동생성 (소급)`,
            }
          })

          console.log(`✅ Created purchase record for import ${importRecord.id}, product ${product.name}`)
          createdCount++
        } else {
          console.log(`⏭️  Skipping import ${importRecord.id}: No product or unit cost`)
          skippedCount++
        }
      } catch (error) {
        console.error(`❌ Error processing import ${importRecord.id}:`, error)
        errorCount++
      }
    }

    console.log('\n📊 Backfill Summary:')
    console.log(`   ✅ Created: ${createdCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   📝 Total processed: ${importRecords.length}`)
    console.log('\n✨ Backfill complete!')

  } catch (error) {
    console.error('❌ Fatal error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
