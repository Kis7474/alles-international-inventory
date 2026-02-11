/**
 * Migration script to fix SalesRecord.cost field
 * 
 * Before: cost stored as total cost (quantity × unit cost)
 * After: cost stored as unit cost
 * 
 * This script:
 * 1. Updates all existing SalesRecord entries where cost is stored as total cost
 * 2. Converts cost to unit cost by dividing by quantity
 * 3. Recalculates margin and marginRate based on new unit cost
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration: Convert SalesRecord.cost from total cost to unit cost')
  
  try {
    // Get all sales records where type is SALES (cost only applies to sales)
    const salesRecords = await prisma.salesRecord.findMany({
      where: {
        type: 'SALES',
        quantity: { gt: 0 }, // Avoid division by zero
      },
      select: {
        id: true,
        quantity: true,
        cost: true,
        amount: true,
        margin: true,
        marginRate: true,
      },
    })
    
    console.log(`Found ${salesRecords.length} sales records to process`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const record of salesRecords) {
      // Calculate what the unit cost should be
      const currentTotalCost = record.cost
      const unitCost = currentTotalCost / record.quantity
      
      // Recalculate margin and marginRate based on unit cost
      const newTotalCost = unitCost * record.quantity
      const newMargin = record.amount - newTotalCost
      const newMarginRate = record.amount > 0 ? (newMargin / record.amount) * 100 : 0
      
      // Check if the cost value appears to already be a unit cost
      // If cost is already unit cost, then margin should equal amount - (cost × quantity)
      // If cost is total cost, then margin should equal amount - cost
      const marginIfUnitCost = record.amount - (record.cost * record.quantity)
      const marginDifference = Math.abs(record.margin - marginIfUnitCost)
      const marginThreshold = Math.abs(record.amount) * 0.01 // 1% of amount threshold
      
      if (marginDifference <= marginThreshold) {
        // Margin matches what it would be if cost is already unit cost
        // This record likely already has unit cost, skip it
        skippedCount++
        continue
      }
      
      // Update the record with unit cost
      await prisma.salesRecord.update({
        where: { id: record.id },
        data: {
          cost: unitCost,
          margin: newMargin,
          marginRate: newMarginRate,
        },
      })
      
      updatedCount++
      
      if (updatedCount % 100 === 0) {
        console.log(`Progress: Updated ${updatedCount} records...`)
      }
    }
    
    console.log('\nMigration completed successfully!')
    console.log(`Total records processed: ${salesRecords.length}`)
    console.log(`Updated: ${updatedCount}`)
    console.log(`Skipped (already unit cost): ${skippedCount}`)
    
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
