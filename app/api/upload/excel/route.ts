import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseExcelFile, parseTransactionExcel, generateCode } from '@/lib/excel-parser'

// Vercel API route configuration
export const maxDuration = 300 // Maximum execution time in seconds (5 minutes)
export const dynamic = 'force-dynamic' // Disable static optimization

interface UploadOptions {
  duplicateHandling: 'overwrite' | 'skip' | 'merge'
  createVendors: boolean
  createProducts: boolean
  // New options for transaction upload
  uploadMode?: 'price_matrix' | 'transactions'
  transactionType?: 'SALES' | 'PURCHASE'
  createSalespersons?: boolean
  createCategories?: boolean
}

interface UploadSummary {
  totalRows?: number
  successRows?: number
  failedRows?: number
  vendorsCreated: number
  vendorsUpdated?: number
  productsCreated: number
  productsUpdated?: number
  pricesCreated?: number
  pricesUpdated?: number
  salespersonsCreated?: number
  categoriesCreated?: number
  transactionsCreated?: number
  servicesCreated?: number
  projectsCreated?: number
}

interface ExcelRow {
  productName?: string
  salesVendorName?: string
  category?: string
  serviceHours?: number
  description?: string
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const optionsStr = formData.get('options') as string
    
    if (!file) {
      return NextResponse.json(
        { error: '파일을 선택해주세요.' },
        { status: 400 }
      )
    }
    
    const options: UploadOptions = optionsStr ? JSON.parse(optionsStr) : {
      duplicateHandling: 'skip',
      createVendors: true,
      createProducts: true,
      uploadMode: 'price_matrix',
    }
    
    // Check upload mode and route to appropriate handler
    if (options.uploadMode === 'transactions') {
      return await handleTransactionUpload(file, options)
    } else {
      return await handlePriceMatrixUpload(file, options)
    }
  } catch (error) {
    console.error('Error uploading Excel file:', error)
    return NextResponse.json(
      { error: `파일 업로드 중 오류가 발생했습니다: ${error}` },
      { status: 500 }
    )
  }
}

/**
 * Handle transaction-based Excel upload
 */
async function handleTransactionUpload(file: File, options: UploadOptions) {
  try {
    // Parse transaction Excel
    const rows = await parseTransactionExcel(file)
    
    const summary = {
      totalRows: rows.length,
      successRows: 0,
      failedRows: 0,
      vendorsCreated: 0,
      productsCreated: 0,
      salespersonsCreated: 0,
      categoriesCreated: 0,
      transactionsCreated: 0,
    }
    
    const errors: Array<{ row: number; message: string }> = []
    
    // Step 1: Extract all unique values from parsed rows
    const uniqueVendorNames = new Set<string>()
    const uniqueProductNames = new Set<string>()
    const uniqueCategoryNames = new Set<string>()
    const uniqueSalespersonNames = new Set<string>()
    
    rows.forEach(row => {
      if (row.purchaseVendorName) uniqueVendorNames.add(row.purchaseVendorName)
      if (row.salesVendorName) uniqueVendorNames.add(row.salesVendorName)
      if (row.productName) uniqueProductNames.add(row.productName)
      if (row.category) uniqueCategoryNames.add(row.category)
      if (row.salesperson) uniqueSalespersonNames.add(row.salesperson)
    })
    
    // Counter for unique code generation within this transaction
    let codeCounter = 0
    
    // Wrap the entire upload process in a transaction with chunking
    await prisma.$transaction(async (tx) => {
      // Step 2: Pre-fetch all existing entities in single queries
      const [existingVendors, existingProducts, existingCategories, existingSalespersons, defaultSalesperson, defaultCategory] = await Promise.all([
        tx.vendor.findMany({ where: { name: { in: Array.from(uniqueVendorNames) } } }),
        tx.product.findMany({ where: { name: { in: Array.from(uniqueProductNames) } } }),
        tx.category.findMany({ where: { nameKo: { in: Array.from(uniqueCategoryNames) } } }),
        tx.salesperson.findMany({ where: { name: { in: Array.from(uniqueSalespersonNames) } } }),
        getDefaultSalespersonInTransaction(tx),
        getDefaultCategoryInTransaction(tx),
      ])
      
      // Step 3: Build cache maps for O(1) lookup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vendorMap = new Map<string, any>(existingVendors.map(v => [v.name, v]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productMap = new Map<string, any>(existingProducts.map(p => [p.name, p]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoryMap = new Map<string, any>(existingCategories.map(c => [c.nameKo, c]))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const salespersonMap = new Map<string, any>(existingSalespersons.map(s => [s.name, s]))
      
      // Step 4: Identify new entities to create
      const vendorsToCreate: Array<{ code: string; name: string; type: string; currency: string }> = []
      const productsToCreate: Array<{ code: string; name: string; unit: string; categoryId?: number; purchaseVendorId: number; defaultPurchasePrice?: number }> = []
      const categoriesToCreate: Array<{ code: string; name: string; nameKo: string }> = []
      const salespersonsToCreate: Array<{ code: string; name: string; commissionRate: number }> = []
      
      // Track which vendors to create
      const vendorTypeMap = new Map<string, string>() // name -> type
      uniqueVendorNames.forEach(name => {
        if (!vendorMap.has(name)) {
          // Determine vendor type based on usage in rows
          let type = 'DOMESTIC_PURCHASE'
          for (const row of rows) {
            if (row.purchaseVendorName === name) {
              type = 'DOMESTIC_PURCHASE'
              break
            } else if (row.salesVendorName === name) {
              type = 'DOMESTIC_SALES'
            }
          }
          vendorTypeMap.set(name, type)
        }
      })
      
      // Create vendor entries
      if (options.createVendors) {
        vendorTypeMap.forEach((type, name) => {
          codeCounter++
          vendorsToCreate.push({
            code: `V${Date.now().toString().slice(-8)}-${codeCounter.toString().padStart(4, '0')}`,
            name,
            type,
            currency: type.includes('INTERNATIONAL') ? 'USD' : 'KRW',
          })
        })
      }
      
      // Create category entries
      if (options.createCategories) {
        uniqueCategoryNames.forEach(name => {
          if (!categoryMap.has(name)) {
            codeCounter++
            categoriesToCreate.push({
              code: `CAT${Date.now().toString().slice(-8)}-${codeCounter.toString().padStart(4, '0')}`,
              name,
              nameKo: name,
            })
          }
        })
      }
      
      // Create salesperson entries
      if (options.createSalespersons) {
        uniqueSalespersonNames.forEach(name => {
          if (!salespersonMap.has(name)) {
            codeCounter++
            salespersonsToCreate.push({
              code: `SP${Date.now().toString().slice(-8)}-${codeCounter.toString().padStart(4, '0')}`,
              name,
              commissionRate: 0,
            })
          }
        })
      }
      
      // Step 5: Bulk insert new entities
      if (vendorsToCreate.length > 0) {
        await tx.vendor.createMany({ data: vendorsToCreate, skipDuplicates: true })
        summary.vendorsCreated += vendorsToCreate.length
        // Refresh vendor map with newly created vendors
        const newVendors = await tx.vendor.findMany({ where: { name: { in: vendorsToCreate.map(v => v.name) } } })
        newVendors.forEach(v => vendorMap.set(v.name, v))
      }
      
      if (categoriesToCreate.length > 0) {
        await tx.category.createMany({ data: categoriesToCreate, skipDuplicates: true })
        summary.categoriesCreated += categoriesToCreate.length
        // Refresh category map
        const newCategories = await tx.category.findMany({ where: { nameKo: { in: categoriesToCreate.map(c => c.nameKo) } } })
        newCategories.forEach(c => categoryMap.set(c.nameKo, c))
      }
      
      if (salespersonsToCreate.length > 0) {
        await tx.salesperson.createMany({ data: salespersonsToCreate, skipDuplicates: true })
        summary.salespersonsCreated += salespersonsToCreate.length
        // Refresh salesperson map
        const newSalespersons = await tx.salesperson.findMany({ where: { name: { in: salespersonsToCreate.map(s => s.name) } } })
        newSalespersons.forEach(s => salespersonMap.set(s.name, s))
      }
      
      // Step 6: Create products (requires vendors to be created first)
      if (options.createProducts) {
        uniqueProductNames.forEach(name => {
          if (!productMap.has(name)) {
            // Find purchase vendor for this product
            let purchaseVendorId = null
            let categoryId = undefined
            let unitPrice = 0
            
            for (const row of rows) {
              if (row.productName === name) {
                if (row.purchaseVendorName) {
                  const vendor = vendorMap.get(row.purchaseVendorName)
                  if (vendor) purchaseVendorId = vendor.id
                }
                if (row.category) {
                  const category = categoryMap.get(row.category)
                  if (category) categoryId = category.id
                }
                if (row.unitPrice) unitPrice = row.unitPrice
                break
              }
            }
            
            if (purchaseVendorId) {
              codeCounter++
              productsToCreate.push({
                code: `P${Date.now().toString().slice(-8)}-${codeCounter.toString().padStart(4, '0')}`,
                name,
                unit: 'EA',
                categoryId,
                purchaseVendorId,
                defaultPurchasePrice: unitPrice,
              })
            }
          }
        })
        
        if (productsToCreate.length > 0) {
          await tx.product.createMany({ data: productsToCreate, skipDuplicates: true })
          summary.productsCreated += productsToCreate.length
          // Refresh product map
          const newProducts = await tx.product.findMany({ where: { name: { in: productsToCreate.map(p => p.name) } } })
          newProducts.forEach(p => productMap.set(p.name, p))
        }
      }
      
      // Step 7: Process rows in chunks and prepare bulk operations
      const CHUNK_SIZE = 100
      
      for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, rows.length)
        const chunk = rows.slice(chunkStart, chunkEnd)
        
        // Prepare sales records for bulk insert
        const salesRecordsToCreate = []
        const productUpdates = []
        const productSalesVendorsToCreate = []
        
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i]
          const rowNumber = chunkStart + i + 2 // +2 because Excel is 1-indexed and we skip header
          
          try {
            // Validate required fields
            if (!row.productName) {
              throw new Error('품목명이 비어있습니다.')
            }
            if (!row.quantity || row.quantity <= 0) {
              throw new Error('수량이 유효하지 않습니다.')
            }
            
            // Determine item category and handle branching
            const categoryName = row.category?.trim()
            
            // Branch based on category
            if (categoryName === 'Service' || categoryName === '서비스') {
              // Create/update Service entry - keeping existing logic for special cases
              await handleServiceEntryOptimized(row as unknown as ExcelRow, summary, options, tx, vendorMap, categoryMap, { value: codeCounter++ })
              summary.successRows++
              continue
            } else if (categoryName === 'Project' || categoryName === '프로젝트') {
              // Create/update Project entry - keeping existing logic for special cases
              await handleProjectEntryOptimized(row as unknown as ExcelRow, summary, tx, { value: codeCounter++ })
              summary.successRows++
              continue
            }
            
            // Determine transaction type
            const rowType = row.type?.trim()
            let transactionType = ''
            
            if (rowType === '매출') {
              transactionType = 'SALES'
            } else if (rowType === '매입') {
              transactionType = 'PURCHASE'
            } else if (options.transactionType) {
              transactionType = options.transactionType
            }
            
            if (!transactionType) {
              throw new Error('거래 유형이 선택되지 않았습니다.')
            }
            
            // Get entities from cache
            const purchaseVendor = row.purchaseVendorName ? vendorMap.get(row.purchaseVendorName) : null
            const salesVendor = row.salesVendorName ? vendorMap.get(row.salesVendorName) : null
            const category = row.category ? categoryMap.get(row.category) : null
            const product = productMap.get(row.productName)
            const salesperson = row.salesperson ? salespersonMap.get(row.salesperson) : null
            
            if (!product) {
              throw new Error(`품목 '${row.productName}'를 찾을 수 없습니다. 자동 생성 옵션을 활성화하세요.`)
            }
            
            // Queue product updates
            if (product.id) {
              const updateData: { defaultPurchasePrice?: number; defaultSalesPrice?: number } = {}
              
              if (row.purchasePrice && row.purchasePrice > 0) {
                updateData.defaultPurchasePrice = row.purchasePrice
              }
              
              if (row.unitPrice && row.unitPrice > 0) {
                updateData.defaultSalesPrice = row.unitPrice
              }
              
              if (Object.keys(updateData).length > 0) {
                productUpdates.push({ id: product.id, data: updateData })
              }
            }
            
            // Queue ProductSalesVendor entries
            if (product && salesVendor) {
              productSalesVendorsToCreate.push({
                productId: product.id,
                vendorId: salesVendor.id,
              })
            }
            
            // Parse date
            const transactionDate = new Date(row.date)
            if (isNaN(transactionDate.getTime())) {
              throw new Error(`날짜 형식 오류: ${row.date}`)
            }
            
            // Calculate VAT amounts
            const totalWithVat = row.totalWithVat || row.totalAmount * 1.1
            const supplyAmount = Math.round(totalWithVat / 1.1)
            const vatAmount = totalWithVat - supplyAmount
            
            // Ensure required vendor exists
            const vendorForTransaction = transactionType === 'SALES' ? salesVendor : purchaseVendor
            if (!vendorForTransaction) {
              const vendorType = transactionType === 'SALES' ? '판매처' : '매입처'
              throw new Error(`${vendorType}가 필요합니다.`)
            }
            const vendorNameForTransaction = transactionType === 'SALES' ? row.salesVendorName : row.purchaseVendorName
            
            // Queue sales record for bulk insert
            salesRecordsToCreate.push({
              date: transactionDate,
              type: transactionType,
              vendorId: vendorForTransaction.id,
              productId: product.id,
              salespersonId: salesperson?.id || defaultSalesperson.id,
              categoryId: category?.id || defaultCategory.id,
              itemName: row.productName,
              customer: vendorNameForTransaction,
              quantity: row.quantity,
              unitPrice: row.unitPrice,
              amount: row.totalAmount,
              cost: transactionType === 'SALES' ? (row.totalAmount - row.margin) : 0,
              margin: row.margin,
              marginRate: parseFloat(row.marginRate) || 0,
              vatIncluded: true,
              supplyAmount: supplyAmount,
              vatAmount: vatAmount,
              totalAmount: totalWithVat,
              notes: `엑셀 업로드 (마진: ${row.margin}, 마진율: ${row.marginRate}%)`,
            })
            
            summary.successRows++
          } catch (error) {
            console.error(`Error processing row ${rowNumber}:`, error)
            errors.push({
              row: rowNumber,
              message: error instanceof Error ? error.message : String(error),
            })
            summary.failedRows++
          }
        }
        
        // Bulk insert sales records for this chunk
        if (salesRecordsToCreate.length > 0) {
          await tx.salesRecord.createMany({ data: salesRecordsToCreate })
          summary.transactionsCreated += salesRecordsToCreate.length
        }
        
        // Deduplicate product updates by ID (keep last update for each product)
        const productUpdateMap = new Map<number, { defaultPurchasePrice?: number; defaultSalesPrice?: number }>()
        productUpdates.forEach(update => {
          const existing = productUpdateMap.get(update.id)
          productUpdateMap.set(update.id, { ...existing, ...update.data })
        })
        
        // Bulk update products - optimized with parallel execution
        if (productUpdateMap.size > 0) {
          await Promise.all(Array.from(productUpdateMap.entries()).map(([id, data]) => 
            tx.product.update({ where: { id }, data })
          ))
        }
        
        // Deduplicate ProductSalesVendor entries within the batch
        const psvSet = new Set<string>()
        const uniqueProductSalesVendors = productSalesVendorsToCreate.filter(psv => {
          const key = `${psv.productId}-${psv.vendorId}`
          if (psvSet.has(key)) {
            return false
          }
          psvSet.add(key)
          return true
        })
        
        // Bulk upsert ProductSalesVendor relationships - optimized
        if (uniqueProductSalesVendors.length > 0) {
          // First, find existing relationships
          const existingPsvs = await tx.productSalesVendor.findMany({
            where: {
              OR: uniqueProductSalesVendors.map(psv => ({
                productId: psv.productId,
                vendorId: psv.vendorId,
              })),
            },
            select: { productId: true, vendorId: true },
          })

          // Create a Set for fast lookup
          const existingPsvSet = new Set(
            existingPsvs.map(p => `${p.productId}-${p.vendorId}`)
          )

          // Filter out existing ones to get only new relationships
          const newPsvs = uniqueProductSalesVendors.filter(
            psv => !existingPsvSet.has(`${psv.productId}-${psv.vendorId}`)
          )

          // Bulk create new relationships
          if (newPsvs.length > 0) {
            await tx.productSalesVendor.createMany({ 
              data: newPsvs, 
              skipDuplicates: true 
            })
          }
        }
      }
    }, {
      // Transaction timeout configuration (in milliseconds)
      timeout: 290000, // 290 seconds (4 minutes 50 seconds), slightly less than maxDuration
    })
    
    return NextResponse.json({
      success: true,
      summary,
      errors,
    })
  } catch (error) {
    console.error('Error in handleTransactionUpload:', error)
    return NextResponse.json(
      { error: `거래 데이터 업로드 중 오류가 발생했습니다: ${error}` },
      { status: 500 }
    )
  }
}

/**
 * Handle price matrix Excel upload (optimized with bulk operations and caching)
 */
async function handlePriceMatrixUpload(file: File, options: UploadOptions) {
  try {
    // Parse Excel file
    const parsed = await parseExcelFile(file)
    
    const summary = {
      vendorsCreated: 0,
      vendorsUpdated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      pricesCreated: 0,
      pricesUpdated: 0,
    }
    
    const errors: Array<{ row: number; column: string; message: string }> = []
    
    // Step 1: Extract unique vendors and products
    const uniqueVendors = Array.from(new Set(parsed.vendors.filter(v => v)))
    const uniqueProducts = Array.from(new Set(parsed.products.filter(p => p)))
    
    // Step 2: Pre-fetch all existing entities in single queries
    const [existingVendors, existingProducts, defaultVendor] = await Promise.all([
      prisma.vendor.findMany({ where: { name: { in: uniqueVendors } } }),
      prisma.product.findMany({ where: { name: { in: uniqueProducts } } }),
      prisma.vendor.findFirst({ where: { code: 'DEFAULT_PURCHASE' } }),
    ])
    
    // Step 3: Build cache maps for O(1) lookup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vendorMap = new Map<string, any>(existingVendors.map(v => [v.name, v]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productMap = new Map<string, any>(existingProducts.map(p => [p.name, p]))
    
    // Step 4: Prepare bulk operations
    const vendorsToCreate: Array<{ code: string; name: string; type: string }> = []
    const productsToCreate: Array<{ code: string; name: string; unit: string; purchaseVendorId: number }> = []
    
    // Identify new vendors to create
    if (options.createVendors) {
      uniqueVendors.forEach(vendorName => {
        if (!vendorMap.has(vendorName)) {
          vendorsToCreate.push({
            code: generateCode(vendorName),
            name: vendorName,
            type: 'DOMESTIC',
          })
        }
      })
    }
    
    // Identify new products to create (requires default vendor)
    if (options.createProducts && defaultVendor) {
      uniqueProducts.forEach(productName => {
        if (!productMap.has(productName)) {
          productsToCreate.push({
            code: generateCode(productName),
            name: productName,
            unit: '개',
            purchaseVendorId: defaultVendor.id,
          })
        }
      })
    } else if (options.createProducts && !defaultVendor) {
      errors.push({
        row: 0,
        column: '품목',
        message: '기본 매입처가 없어 신규 품목을 생성할 수 없습니다.',
      })
    }
    
    // Step 5: Bulk insert vendors and products
    await prisma.$transaction(async (tx) => {
      // Bulk create vendors
      if (vendorsToCreate.length > 0) {
        await tx.vendor.createMany({ data: vendorsToCreate, skipDuplicates: true })
        summary.vendorsCreated += vendorsToCreate.length
        
        // Refresh vendor map
        const newVendors = await tx.vendor.findMany({ where: { name: { in: vendorsToCreate.map(v => v.name) } } })
        newVendors.forEach(v => vendorMap.set(v.name, v))
      }
      
      // Track existing vendors
      summary.vendorsUpdated = uniqueVendors.length - vendorsToCreate.length
      
      // Bulk create products
      if (productsToCreate.length > 0) {
        await tx.product.createMany({ data: productsToCreate, skipDuplicates: true })
        summary.productsCreated += productsToCreate.length
        
        // Refresh product map
        const newProducts = await tx.product.findMany({ where: { name: { in: productsToCreate.map(p => p.name) } } })
        newProducts.forEach(p => productMap.set(p.name, p))
      }
      
      // Track existing products
      summary.productsUpdated = uniqueProducts.length - productsToCreate.length
      
      // Step 6: Process prices in chunks
      const CHUNK_SIZE = 100
      const effectiveDate = new Date()
      effectiveDate.setHours(0, 0, 0, 0) // Normalize to start of day
      
      for (let chunkStart = 0; chunkStart < parsed.prices.length; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, parsed.prices.length)
        const chunk = parsed.prices.slice(chunkStart, chunkEnd)
        
        // Prepare data for this chunk
        const pricesToCreate = []
        const pricesToUpdate = []
        const priceKeys = new Set<string>()
        
        for (const price of chunk) {
          try {
            const vendor = vendorMap.get(price.vendorName)
            const product = productMap.get(price.productName)
            
            if (!vendor || !product) {
              continue // Skip if vendor or product doesn't exist
            }
            
            const priceKey = `${vendor.id}-${product.id}`
            
            // Avoid duplicate prices in same chunk
            if (priceKeys.has(priceKey)) {
              continue
            }
            priceKeys.add(priceKey)
            
            pricesToCreate.push({
              vendorId: vendor.id,
              productId: product.id,
              salesPrice: price.salesPrice,
              purchasePrice: price.purchasePrice,
              effectiveDate,
            })
          } catch (error) {
            console.error(`Error processing price for ${price.vendorName} - ${price.productName}:`, error)
            errors.push({
              row: 0,
              column: 'price',
              message: `가격 정보 처리 실패 (${price.vendorName} - ${price.productName}): ${error}`,
            })
          }
        }
        
        // Check for existing prices
        if (pricesToCreate.length > 0) {
          const existingPrices = await tx.vendorProductPrice.findMany({
            where: {
              OR: pricesToCreate.map(p => ({
                vendorId: p.vendorId,
                productId: p.productId,
                effectiveDate,
              })),
            },
          })
          
          const existingPriceMap = new Map(
            existingPrices.map(p => [`${p.vendorId}-${p.productId}`, p])
          )
          
          const newPrices = []
          
          for (const priceData of pricesToCreate) {
            const key = `${priceData.vendorId}-${priceData.productId}`
            const existing = existingPriceMap.get(key)
            
            if (existing) {
              if (options.duplicateHandling === 'overwrite' || options.duplicateHandling === 'merge') {
                pricesToUpdate.push({
                  id: existing.id,
                  data: {
                    salesPrice: priceData.salesPrice,
                    purchasePrice: priceData.purchasePrice,
                  },
                })
              }
              summary.pricesUpdated++
            } else {
              newPrices.push(priceData)
            }
          }
          
          // Bulk insert new prices
          if (newPrices.length > 0) {
            await tx.vendorProductPrice.createMany({ data: newPrices, skipDuplicates: true })
            summary.pricesCreated += newPrices.length
          }
          
          // Bulk update existing prices - optimized with parallel execution
          if (pricesToUpdate.length > 0) {
            await Promise.all(pricesToUpdate.map(update =>
              tx.vendorProductPrice.update({
                where: { id: update.id },
                data: update.data,
              })
            ))
          }
        }
      }
    }, {
      // Transaction timeout configuration
      timeout: 290000, // 290 seconds (4 minutes 50 seconds)
    })
    
    return NextResponse.json({
      success: true,
      summary,
      errors,
    })
  } catch (error) {
    console.error('Error in handlePriceMatrixUpload:', error)
    return NextResponse.json(
      { error: `가격 데이터 업로드 중 오류가 발생했습니다: ${error}` },
      { status: 500 }
    )
  }
}

/**
 * Handle Service category entry
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleServiceEntry(row: ExcelRow, summary: UploadSummary, options: UploadOptions) {
  // Find or create sales vendor
  let salesVendor = null
  if (row.salesVendorName) {
    salesVendor = await findOrCreateVendorByType(
      row.salesVendorName,
      'DOMESTIC_SALES',
      options.createVendors || false
    )
    if (salesVendor?.isNew) summary.vendorsCreated++
  }
  
  // Find or create category
  let category = null
  if (row.category) {
    category = await findOrCreateCategory(row.category, options.createCategories || false)
    if (category?.isNew) {
      summary.categoriesCreated = (summary.categoriesCreated || 0) + 1
    }
  }
  
  // Find or create service
  const existingService = await prisma.service.findFirst({
    where: { name: row.productName }
  })
  
  if (existingService) {
    // Update service with non-blank fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0) {
      updateData.serviceHours = row.serviceHours
    }
    if (salesVendor) {
      updateData.salesVendorId = salesVendor.data.id
    }
    if (category) {
      updateData.categoryId = category.data.id
    }
    if (row.description) {
      updateData.description = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.service.update({
        where: { id: existingService.id },
        data: updateData
      })
    }
  } else {
    // Create new service
    const code = `SVC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    await prisma.service.create({
      data: {
        code,
        name: row.productName || 'Unknown Service',
        description: row.description || null,
        serviceHours: row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0 ? row.serviceHours : null,
        salesVendorId: salesVendor?.data.id || null,
        categoryId: category?.data.id || null,
      }
    })
    summary.productsCreated++
  }
}

/**
 * Handle Project category entry
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleProjectEntry(row: ExcelRow, summary: UploadSummary, options: UploadOptions) {
  // Find or create project
  const existingProject = await prisma.project.findFirst({
    where: { name: row.productName }
  })
  
  if (existingProject) {
    // Update project with non-blank fields
    const updateData: Record<string, unknown> = {}
    
    if (row.salesVendorName) {
      updateData.customer = row.salesVendorName
    }
    if (row.unitPrice && typeof row.unitPrice === 'number' && row.unitPrice > 0) {
      updateData.salesPrice = row.unitPrice * ((typeof row.quantity === 'number' ? row.quantity : 0) || 1)
    }
    if (row.description) {
      updateData.memo = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.project.update({
        where: { id: existingProject.id },
        data: updateData
      })
    }
  } else {
    // Create new project
    const code = `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const startDate = row.date && typeof row.date === 'string' ? new Date(row.date) : new Date()
    const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0
    const quantity = typeof row.quantity === 'number' ? row.quantity : 1
    const salesPrice = unitPrice * quantity
    
    await prisma.project.create({
      data: {
        code,
        name: row.productName || 'Unknown Project',
        customer: row.salesVendorName || null,
        startDate: startDate,
        status: 'IN_PROGRESS',
        currency: 'KRW',
        exchangeRate: 1,
        partsCost: 0,
        laborCost: 0,
        customsCost: 0,
        shippingCost: 0,
        otherCost: 0,
        totalCost: 0,
        salesPrice: salesPrice,
        margin: salesPrice,
        marginRate: 100,
        memo: row.description || null,
      }
    })
    summary.productsCreated++
  }
}

/**
 * Find or create vendor (legacy)
 * 
 * This function is kept for backward compatibility with the price matrix upload feature.
 * The price matrix upload path currently uses direct vendor creation without type specification.
 * 
 * New code should use findOrCreateVendorByType instead.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateVendor(name: string, autoCreate: boolean) {
  const existing = await prisma.vendor.findFirst({
    where: { name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  const newVendor = await prisma.vendor.create({
    data: {
      code: generateCode(name),
      name,
      type: 'DOMESTIC_PURCHASE',
      currency: 'KRW',
    },
  })
  
  return { data: newVendor, isNew: true }
}

/**
 * Find or create vendor by specific type
 */
async function findOrCreateVendorByType(
  name: string,
  type: 'DOMESTIC_PURCHASE' | 'DOMESTIC_SALES' | 'INTERNATIONAL_PURCHASE' | 'INTERNATIONAL_SALES',
  autoCreate: boolean
) {
  if (!name) return null
  
  // First try to find by name
  const existing = await prisma.vendor.findFirst({
    where: { name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  // Create new vendor with specific type
  const code = `V${Date.now().toString().slice(-6)}`
  const newVendor = await prisma.vendor.create({
    data: {
      code,
      name,
      type,
      currency: type.includes('INTERNATIONAL') ? 'USD' : 'KRW',
    },
  })
  
  return { data: newVendor, isNew: true }
}

/**
 * Find or create product (legacy)
 * 
 * This function is kept for backward compatibility with the price matrix upload feature.
 * It uses a default purchase vendor when creating new products.
 * 
 * New code should use findOrCreateProductWithVendor which requires explicit vendor specification.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateProduct(name: string, categoryId: number | undefined, autoCreate: boolean) {
  const existing = await prisma.product.findFirst({
    where: { name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  // Get default purchase vendor
  const defaultVendor = await prisma.vendor.findFirst({
    where: { code: 'DEFAULT_PURCHASE' },
  })
  
  if (!defaultVendor) {
    throw new Error('기본 매입처가 없습니다. 품목을 생성할 수 없습니다.')
  }
  
  const newProduct = await prisma.product.create({
    data: {
      code: generateCode(name),
      name,
      unit: '개',
      categoryId: categoryId,
      purchaseVendorId: defaultVendor.id,
    },
  })
  
  return { data: newProduct, isNew: true }
}

/**
 * Find or create product with vendor connection
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateProductWithVendor(
  name: string,
  purchaseVendorId: number | null,
  categoryId: number | undefined,
  unitPrice: number,
  autoCreate: boolean
) {
  if (!name) return null
  
  // Find existing product
  const existing = await prisma.product.findFirst({
    where: { name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  if (!purchaseVendorId) {
    throw new Error(`품목 '${name}'의 매입처가 필요합니다.`)
  }
  
  // Create new product
  const code = `P${Date.now().toString().slice(-6)}`
  const newProduct = await prisma.product.create({
    data: {
      code,
      name,
      unit: 'EA',
      categoryId: categoryId,
      purchaseVendorId,
      defaultPurchasePrice: unitPrice,
    },
  })
  
  return { data: newProduct, isNew: true }
}

/**
 * Find or create salesperson
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateSalesperson(name: string, autoCreate: boolean) {
  const existing = await prisma.salesperson.findFirst({
    where: { name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  const newSalesperson = await prisma.salesperson.create({
    data: {
      code: generateCode(name),
      name,
      commissionRate: 0,
    },
  })
  
  return { data: newSalesperson, isNew: true }
}

/**
 * Find or create category
 */
async function findOrCreateCategory(name: string, autoCreate: boolean) {
  if (!name) return null
  
  // Try to find by nameKo first
  const existing = await prisma.category.findFirst({
    where: { nameKo: name },
  })
  
  if (existing) {
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  const newCategory = await prisma.category.create({
    data: {
      code: generateCode(name),
      name,
      nameKo: name,
    },
  })
  
  return { data: newCategory, isNew: true }
}

/**
 * Get default salesperson (create if not exists)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getDefaultSalesperson() {
  let salesperson = await prisma.salesperson.findFirst({
    where: { code: 'DEFAULT' },
  })
  
  if (!salesperson) {
    salesperson = await prisma.salesperson.create({
      data: {
        code: 'DEFAULT',
        name: '미지정',
        commissionRate: 0,
      },
    })
  }
  
  return salesperson
}

/**
 * Get default category (create if not exists)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getDefaultCategory() {
  let category = await prisma.category.findFirst({
    where: { code: 'DEFAULT' },
  })
  
  if (!category) {
    category = await prisma.category.create({
      data: {
        code: 'DEFAULT',
        name: '미분류',
        nameKo: '미분류',
      },
    })
  }
  
  return category
}

/**
 * Cached helper functions for transaction processing
 */

/**
 * Find or create vendor by specific type with caching
 */
async function findOrCreateVendorByTypeWithCache(
  name: string,
  type: 'DOMESTIC_PURCHASE' | 'DOMESTIC_SALES' | 'INTERNATIONAL_PURCHASE' | 'INTERNATIONAL_SALES',
  autoCreate: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Map<string, { id: number; data: any; isNew: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  if (!name) return null
  
  const cacheKey = `${name}:${type}`
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!
    return { data: cached.data, isNew: false }
  }
  
  // Find in database
  const existing = await tx.vendor.findFirst({
    where: { name },
  })
  
  if (existing) {
    cache.set(cacheKey, { id: existing.id, data: existing, isNew: false })
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  // Create new vendor with unique code using counter
  codeCounter.value++
  const code = `V${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
  const newVendor = await tx.vendor.create({
    data: {
      code,
      name,
      type,
      currency: type.includes('INTERNATIONAL') ? 'USD' : 'KRW',
    },
  })
  
  cache.set(cacheKey, { id: newVendor.id, data: newVendor, isNew: true })
  return { data: newVendor, isNew: true }
}

/**
 * Find or create category with caching
 */
async function findOrCreateCategoryWithCache(
  name: string,
  autoCreate: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Map<string, { id: number; data: any; isNew: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  if (!name) return null
  
  // Check cache first
  if (cache.has(name)) {
    const cached = cache.get(name)!
    return { data: cached.data, isNew: false }
  }
  
  // Find in database
  const existing = await tx.category.findFirst({
    where: { nameKo: name },
  })
  
  if (existing) {
    cache.set(name, { id: existing.id, data: existing, isNew: false })
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  // Create new category with unique code using counter
  codeCounter.value++
  const code = `CAT${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
  const newCategory = await tx.category.create({
    data: {
      code,
      name,
      nameKo: name,
    },
  })
  
  cache.set(name, { id: newCategory.id, data: newCategory, isNew: true })
  return { data: newCategory, isNew: true }
}

/**
 * Find or create product with vendor connection and caching
 * (Kept for backward compatibility - currently used by old cached approach)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateProductWithVendorWithCache(
  name: string,
  purchaseVendorId: number | null,
  categoryId: number | undefined,
  unitPrice: number,
  autoCreate: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Map<string, { id: number; data: any; isNew: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  if (!name) return null
  
  // Check cache first
  if (cache.has(name)) {
    const cached = cache.get(name)!
    return { data: cached.data, isNew: false }
  }
  
  // Find existing product
  const existing = await tx.product.findFirst({
    where: { name },
  })
  
  if (existing) {
    cache.set(name, { id: existing.id, data: existing, isNew: false })
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  if (!purchaseVendorId) {
    throw new Error(`품목 '${name}'의 매입처가 필요합니다.`)
  }
  
  // Create new product with unique code using counter
  codeCounter.value++
  const code = `P${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
  const newProduct = await tx.product.create({
    data: {
      code,
      name,
      unit: 'EA',
      categoryId: categoryId,
      purchaseVendorId,
      defaultPurchasePrice: unitPrice,
    },
  })
  
  cache.set(name, { id: newProduct.id, data: newProduct, isNew: true })
  return { data: newProduct, isNew: true }
}

/**
 * Find or create salesperson with caching
 * (Kept for backward compatibility - currently used by old cached approach)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findOrCreateSalespersonWithCache(
  name: string,
  autoCreate: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cache: Map<string, { id: number; data: any; isNew: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  // Check cache first
  if (cache.has(name)) {
    const cached = cache.get(name)!
    return { data: cached.data, isNew: false }
  }
  
  // Find in database
  const existing = await tx.salesperson.findFirst({
    where: { name },
  })
  
  if (existing) {
    cache.set(name, { id: existing.id, data: existing, isNew: false })
    return { data: existing, isNew: false }
  }
  
  if (!autoCreate) {
    return null
  }
  
  // Create new salesperson with unique code using counter
  codeCounter.value++
  const code = `SP${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
  const newSalesperson = await tx.salesperson.create({
    data: {
      code,
      name,
      commissionRate: 0,
    },
  })
  
  cache.set(name, { id: newSalesperson.id, data: newSalesperson, isNew: true })
  return { data: newSalesperson, isNew: true }
}

/**
 * Get default salesperson in transaction context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDefaultSalespersonInTransaction(tx: any) {
  let salesperson = await tx.salesperson.findFirst({
    where: { code: 'DEFAULT' },
  })
  
  if (!salesperson) {
    salesperson = await tx.salesperson.create({
      data: {
        code: 'DEFAULT',
        name: '미지정',
        commissionRate: 0,
      },
    })
  }
  
  return salesperson
}

/**
 * Get default category in transaction context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDefaultCategoryInTransaction(tx: any) {
  let category = await tx.category.findFirst({
    where: { code: 'DEFAULT' },
  })
  
  if (!category) {
    category = await tx.category.create({
      data: {
        code: 'DEFAULT',
        name: '미분류',
        nameKo: '미분류',
      },
    })
  }
  
  return category
}

/**
 * Handle Service category entry in transaction
 * (Kept for backward compatibility - replaced by handleServiceEntryOptimized)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleServiceEntryInTransaction(
  row: ExcelRow,
  summary: UploadSummary,
  options: UploadOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendorCache: Map<string, { id: number; data: any; isNew: boolean }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categoryCache: Map<string, { id: number; data: any; isNew: boolean }>,
  codeCounter: { value: number }
) {
  // Find or create sales vendor
  let salesVendor = null
  if (row.salesVendorName) {
    salesVendor = await findOrCreateVendorByTypeWithCache(
      row.salesVendorName,
      'DOMESTIC_SALES',
      options.createVendors || false,
      vendorCache,
      tx,
      codeCounter
    )
    if (salesVendor?.isNew) summary.vendorsCreated++
  }
  
  // Find or create category
  let category = null
  if (row.category) {
    category = await findOrCreateCategoryWithCache(row.category, options.createCategories || false, categoryCache, tx, codeCounter)
    if (category?.isNew) {
      summary.categoriesCreated = (summary.categoriesCreated || 0) + 1
    }
  }
  
  // Find or create service
  const existingService = await tx.service.findFirst({
    where: { name: row.productName }
  })
  
  if (existingService) {
    // Update service with non-blank fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0) {
      updateData.serviceHours = row.serviceHours
    }
    if (salesVendor) {
      updateData.salesVendorId = salesVendor.data.id
    }
    if (category) {
      updateData.categoryId = category.data.id
    }
    if (row.description) {
      updateData.description = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await tx.service.update({
        where: { id: existingService.id },
        data: updateData
      })
    }
  } else {
    // Create new service with unique code using counter
    codeCounter.value++
    const code = `SVC${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
    await tx.service.create({
      data: {
        code,
        name: row.productName || 'Unknown Service',
        description: row.description || null,
        serviceHours: row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0 ? row.serviceHours : null,
        salesVendorId: salesVendor?.data.id || null,
        categoryId: category?.data.id || null,
      }
    })
    summary.productsCreated++
  }
}

/**
 * Handle Project category entry in transaction
 * (Kept for backward compatibility - replaced by handleProjectEntryOptimized)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleProjectEntryInTransaction(
  row: ExcelRow,
  summary: UploadSummary,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: UploadOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  // Find or create project
  const existingProject = await tx.project.findFirst({
    where: { name: row.productName }
  })
  
  if (existingProject) {
    // Update project with non-blank fields
    const updateData: Record<string, unknown> = {}
    
    if (row.salesVendorName) {
      updateData.customer = row.salesVendorName
    }
    if (row.unitPrice && typeof row.unitPrice === 'number' && row.unitPrice > 0) {
      updateData.salesPrice = row.unitPrice * ((typeof row.quantity === 'number' ? row.quantity : 0) || 1)
    }
    if (row.description) {
      updateData.memo = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await tx.project.update({
        where: { id: existingProject.id },
        data: updateData
      })
    }
  } else {
    // Create new project with unique code using counter
    codeCounter.value++
    const code = `PRJ${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
    const startDate = row.date && typeof row.date === 'string' ? new Date(row.date) : new Date()
    const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0
    const quantity = typeof row.quantity === 'number' ? row.quantity : 1
    const salesPrice = unitPrice * quantity
    
    await tx.project.create({
      data: {
        code,
        name: row.productName || 'Unknown Project',
        customer: row.salesVendorName || null,
        startDate: startDate,
        status: 'IN_PROGRESS',
        currency: 'KRW',
        exchangeRate: 1,
        partsCost: 0,
        laborCost: 0,
        customsCost: 0,
        shippingCost: 0,
        otherCost: 0,
        totalCost: 0,
        salesPrice: salesPrice,
        margin: salesPrice,
        marginRate: 100,
        memo: row.description || null,
      }
    })
    summary.productsCreated++
  }
}

/**
 * Handle Service category entry with optimized caching (using Maps instead of cache objects)
 */
async function handleServiceEntryOptimized(
  row: ExcelRow,
  summary: UploadSummary,
  options: UploadOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendorMap: Map<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categoryMap: Map<string, any>,
  codeCounter: { value: number }
) {
  // Get entities from map
  const salesVendor = row.salesVendorName ? vendorMap.get(row.salesVendorName) : null
  const category = row.category ? categoryMap.get(row.category) : null
  
  // Find or create service
  const existingService = await tx.service.findFirst({
    where: { name: row.productName }
  })
  
  if (existingService) {
    // Update service with non-blank fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0) {
      updateData.serviceHours = row.serviceHours
    }
    if (salesVendor) {
      updateData.salesVendorId = salesVendor.id
    }
    if (category) {
      updateData.categoryId = category.id
    }
    if (row.description) {
      updateData.description = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await tx.service.update({
        where: { id: existingService.id },
        data: updateData
      })
    }
  } else {
    // Create new service with unique code using counter
    codeCounter.value++
    const code = `SVC${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
    await tx.service.create({
      data: {
        code,
        name: row.productName || 'Unknown Service',
        description: row.description || null,
        serviceHours: row.serviceHours && typeof row.serviceHours === 'number' && row.serviceHours > 0 ? row.serviceHours : null,
        salesVendorId: salesVendor?.id || null,
        categoryId: category?.id || null,
      }
    })
    summary.productsCreated++
  }
}

/**
 * Handle Project category entry with optimized approach
 */
async function handleProjectEntryOptimized(
  row: ExcelRow,
  summary: UploadSummary,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  codeCounter: { value: number }
) {
  // Find or create project
  const existingProject = await tx.project.findFirst({
    where: { name: row.productName }
  })
  
  if (existingProject) {
    // Update project with non-blank fields
    const updateData: Record<string, unknown> = {}
    
    if (row.salesVendorName) {
      updateData.customer = row.salesVendorName
    }
    if (row.unitPrice && typeof row.unitPrice === 'number' && row.unitPrice > 0) {
      updateData.salesPrice = row.unitPrice * ((typeof row.quantity === 'number' ? row.quantity : 0) || 1)
    }
    if (row.description) {
      updateData.memo = row.description
    }
    
    if (Object.keys(updateData).length > 0) {
      await tx.project.update({
        where: { id: existingProject.id },
        data: updateData
      })
    }
  } else {
    // Create new project with unique code using counter
    codeCounter.value++
    const code = `PRJ${Date.now().toString().slice(-8)}-${codeCounter.value.toString().padStart(4, '0')}`
    const startDate = row.date && typeof row.date === 'string' ? new Date(row.date) : new Date()
    const unitPrice = typeof row.unitPrice === 'number' ? row.unitPrice : 0
    const quantity = typeof row.quantity === 'number' ? row.quantity : 1
    const salesPrice = unitPrice * quantity
    
    await tx.project.create({
      data: {
        code,
        name: row.productName || 'Unknown Project',
        customer: row.salesVendorName || null,
        startDate: startDate,
        status: 'IN_PROGRESS',
        currency: 'KRW',
        exchangeRate: 1,
        partsCost: 0,
        laborCost: 0,
        customsCost: 0,
        shippingCost: 0,
        otherCost: 0,
        totalCost: 0,
        salesPrice: salesPrice,
        margin: salesPrice,
        marginRate: 100,
        memo: row.description || null,
      }
    })
    summary.productsCreated++
  }
}
