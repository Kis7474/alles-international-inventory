import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseExcelFile, parseTransactionExcel, generateCode } from '@/lib/excel-parser'

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
    
    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // +2 because Excel is 1-indexed and we skip header
      
      try {
        // Validate required fields
        if (!row.vendorName) {
          throw new Error('거래처명이 비어있습니다.')
        }
        if (!row.productName) {
          throw new Error('품목명이 비어있습니다.')
        }
        if (!row.quantity || row.quantity <= 0) {
          throw new Error('수량이 유효하지 않습니다.')
        }
        
        // Determine transaction type: use row.type if provided, otherwise use options.transactionType
        let transactionType = row.type ? (row.type === '매출' ? 'SALES' : row.type === '매입' ? 'PURCHASE' : '') : options.transactionType
        if (!transactionType) {
          throw new Error('거래 유형이 선택되지 않았습니다.')
        }
        
        // 1. Find or create vendor
        const vendor = await findOrCreateVendor(row.vendorName, options.createVendors || false)
        if (!vendor) {
          throw new Error(`거래처 '${row.vendorName}'를 찾을 수 없습니다. 자동 생성 옵션을 활성화하세요.`)
        }
        if (vendor.isNew) summary.vendorsCreated++
        
        // 2. Find or create category
        let category = null
        if (row.category) {
          category = await findOrCreateCategory(row.category, options.createCategories || false)
          if (category && category.isNew) summary.categoriesCreated++
        }
        
        // 3. Find or create product
        const product = await findOrCreateProduct(
          row.productName, 
          category?.data.id, 
          options.createProducts || false
        )
        if (!product) {
          throw new Error(`품목 '${row.productName}'를 찾을 수 없습니다. 자동 생성 옵션을 활성화하세요.`)
        }
        if (product.isNew) summary.productsCreated++
        
        // 4. Find or create salesperson
        let salesperson = null
        if (row.salesperson) {
          salesperson = await findOrCreateSalesperson(row.salesperson, options.createSalespersons || false)
          if (salesperson && salesperson.isNew) summary.salespersonsCreated++
        }
        
        // 5. Parse date
        const transactionDate = new Date(row.date)
        if (isNaN(transactionDate.getTime())) {
          throw new Error(`날짜 형식 오류: ${row.date}`)
        }
        
        // 6. Calculate VAT amounts
        const totalWithVat = row.totalWithVat || row.totalAmount * 1.1
        const supplyAmount = Math.round(totalWithVat / 1.1)
        const vatAmount = totalWithVat - supplyAmount
        
        // 7. Create SalesRecord (using SalesRecord instead of Transaction)
        await prisma.salesRecord.create({
          data: {
            date: transactionDate,
            type: transactionType,
            vendorId: vendor.data.id,
            productId: product.data.id,
            salespersonId: salesperson?.data.id || (await getDefaultSalesperson()).id,
            categoryId: category?.data.id || (await getDefaultCategory()).id,
            itemName: row.productName,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            amount: row.totalAmount,
            cost: transactionType === 'SALES' ? (row.totalAmount - row.margin) : 0,
            margin: row.margin,
            marginRate: parseFloat(row.marginRate.replace('%', '')) || 0,
            vatIncluded: true,
            supplyAmount: supplyAmount,
            vatAmount: vatAmount,
            totalAmount: totalWithVat,
            notes: `엑셀 업로드 (마진: ${row.margin}, 마진율: ${row.marginRate})`,
          },
        })
        
        summary.transactionsCreated++
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
 * Handle price matrix Excel upload (original functionality)
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
    
    // Process vendors
    const uniqueVendors = Array.from(new Set(parsed.vendors))
    for (const vendorName of uniqueVendors) {
      if (!vendorName) continue
      
      try {
        const existing = await prisma.vendor.findFirst({
          where: { name: vendorName },
        })
        
        if (existing) {
          if (options.duplicateHandling === 'overwrite' || options.duplicateHandling === 'merge') {
            // Update exists, but for now we just skip
            summary.vendorsUpdated++
          } else {
            summary.vendorsUpdated++
          }
        } else if (options.createVendors) {
          await prisma.vendor.create({
            data: {
              code: generateCode(vendorName),
              name: vendorName,
              type: 'DOMESTIC',
            },
          })
          summary.vendorsCreated++
        }
      } catch (error) {
        console.error(`Error processing vendor ${vendorName}:`, error)
        errors.push({
          row: 0,
          column: 'vendor',
          message: `거래처 ${vendorName} 처리 실패: ${error}`,
        })
      }
    }
    
    // Process products
    const uniqueProducts = Array.from(new Set(parsed.products))
    for (const productName of uniqueProducts) {
      if (!productName) continue
      
      try {
        const existing = await prisma.product.findFirst({
          where: { name: productName },
        })
        
        if (existing) {
          summary.productsUpdated++
        } else if (options.createProducts) {
          // Get or create a default purchase vendor
          const defaultVendor = await prisma.vendor.findFirst({
            where: { code: 'DEFAULT_PURCHASE' },
          })
          
          if (!defaultVendor) {
            errors.push({
              row: 0,
              column: '품목',
              message: `기본 매입처가 없어 품목 '${productName}'을(를) 생성할 수 없습니다.`,
            })
            continue
          }
          
          await prisma.product.create({
            data: {
              code: generateCode(productName),
              name: productName,
              unit: '개',
              purchaseVendorId: defaultVendor.id,
            },
          })
          summary.productsCreated++
        }
      } catch (error) {
        console.error(`Error processing product ${productName}:`, error)
        errors.push({
          row: 0,
          column: 'product',
          message: `품목 ${productName} 처리 실패: ${error}`,
        })
      }
    }
    
    // Process prices
    for (const price of parsed.prices) {
      try {
        const vendor = await prisma.vendor.findFirst({
          where: { name: price.vendorName },
        })
        const product = await prisma.product.findFirst({
          where: { name: price.productName },
        })
        
        if (!vendor || !product) {
          continue // Skip if vendor or product doesn't exist
        }
        
        const effectiveDate = new Date()
        effectiveDate.setHours(0, 0, 0, 0) // Normalize to start of day
        
        const existing = await prisma.vendorProductPrice.findFirst({
          where: {
            vendorId: vendor.id,
            productId: product.id,
            effectiveDate,
          },
        })
        
        if (existing) {
          if (options.duplicateHandling === 'overwrite' || options.duplicateHandling === 'merge') {
            await prisma.vendorProductPrice.update({
              where: { id: existing.id },
              data: {
                salesPrice: price.salesPrice,
                purchasePrice: price.purchasePrice,
              },
            })
            summary.pricesUpdated++
          } else {
            summary.pricesUpdated++
          }
        } else {
          await prisma.vendorProductPrice.create({
            data: {
              vendorId: vendor.id,
              productId: product.id,
              salesPrice: price.salesPrice,
              purchasePrice: price.purchasePrice,
              effectiveDate,
            },
          })
          summary.pricesCreated++
        }
      } catch (error) {
        console.error(`Error processing price for ${price.vendorName} - ${price.productName}:`, error)
        errors.push({
          row: 0,
          column: 'price',
          message: `가격 정보 처리 실패 (${price.vendorName} - ${price.productName}): ${error}`,
        })
      }
    }
    
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
 * Find or create vendor
 */
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
      type: 'DOMESTIC',
    },
  })
  
  return { data: newVendor, isNew: true }
}

/**
 * Find or create product
 */
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
 * Find or create salesperson
 */
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
  const existing = await prisma.category.findFirst({
    where: { name },
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
