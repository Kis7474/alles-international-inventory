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
          // Create/update Service entry
          await handleServiceEntry(row, summary, options)
          summary.successRows++
          continue
        } else if (categoryName === 'Project' || categoryName === '프로젝트') {
          // Create/update Project entry
          await handleProjectEntry(row, summary, options)
          summary.successRows++
          continue
        }
        
        // Otherwise, handle as Material/Part (existing logic)
        // Determine transaction type: use row.type if provided, otherwise use options.transactionType
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
        
        // 1. Find or create purchase vendor (매입처 - 매입 유형)
        let purchaseVendor = null
        if (row.purchaseVendorName) {
          purchaseVendor = await findOrCreateVendorByType(
            row.purchaseVendorName,
            'DOMESTIC_PURCHASE',
            options.createVendors || false
          )
          if (!purchaseVendor && options.createProducts) {
            throw new Error(`품목 '${row.productName}'의 매입처가 필요합니다. 매입처 열을 입력해주세요.`)
          }
          if (purchaseVendor?.isNew) summary.vendorsCreated++
        }
        
        // 2. Find or create sales vendor (판매처 - 매출 유형)
        let salesVendor = null
        if (row.salesVendorName) {
          salesVendor = await findOrCreateVendorByType(
            row.salesVendorName,
            'DOMESTIC_SALES',
            options.createVendors || false
          )
          if (salesVendor?.isNew) summary.vendorsCreated++
        }
        
        // 3. Find or create category
        let category = null
        if (row.category) {
          category = await findOrCreateCategory(row.category, options.createCategories || false)
          if (category && category.isNew) summary.categoriesCreated++
        }
        
        // 4. Find or create product (매입처 연결 필수)
        if (!purchaseVendor && options.createProducts) {
          throw new Error(`품목 '${row.productName}'의 매입처가 필요합니다. 매입처 열을 입력해주세요.`)
        }
        
        const product = await findOrCreateProductWithVendor(
          row.productName,
          purchaseVendor?.data.id || null,
          category?.data.id,
          row.unitPrice,
          options.createProducts || false
        )
        if (!product) {
          throw new Error(`품목 '${row.productName}'를 찾을 수 없습니다. 자동 생성 옵션을 활성화하세요.`)
        }
        if (product.isNew) summary.productsCreated++
        
        // Update product's default purchase price and sales price if provided
        if (product.data.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: any = {}
          
          // 매입가 → 기본 매입가
          if (row.purchasePrice && row.purchasePrice > 0) {
            updateData.defaultPurchasePrice = row.purchasePrice
          }
          
          // 판매단가 → 기본 매출가
          if (row.unitPrice && row.unitPrice > 0) {
            updateData.defaultSalesPrice = row.unitPrice
          }
          
          // Update if there's any data to update
          if (Object.keys(updateData).length > 0) {
            await prisma.product.update({
              where: { id: product.data.id },
              data: updateData
            })
          }
        }
        
        // 5. Link product to sales vendor (ProductSalesVendor)
        if (product && salesVendor) {
          await prisma.productSalesVendor.upsert({
            where: {
              productId_vendorId: {
                productId: product.data.id,
                vendorId: salesVendor.data.id,
              },
            },
            update: {},
            create: {
              productId: product.data.id,
              vendorId: salesVendor.data.id,
            },
          })
        }
        
        // 6. Find or create salesperson
        let salesperson = null
        if (row.salesperson) {
          salesperson = await findOrCreateSalesperson(row.salesperson, options.createSalespersons || false)
          if (salesperson && salesperson.isNew) summary.salespersonsCreated++
        }
        
        // 7. Parse date
        const transactionDate = new Date(row.date)
        if (isNaN(transactionDate.getTime())) {
          throw new Error(`날짜 형식 오류: ${row.date}`)
        }
        
        // 8. Calculate VAT amounts
        const totalWithVat = row.totalWithVat || row.totalAmount * 1.1
        const supplyAmount = Math.round(totalWithVat / 1.1)
        const vatAmount = totalWithVat - supplyAmount
        
        // 9. Create SalesRecord
        // Ensure required vendor exists
        const vendorForTransaction = transactionType === 'SALES' ? salesVendor : purchaseVendor
        if (!vendorForTransaction) {
          const vendorType = transactionType === 'SALES' ? '판매처' : '매입처'
          throw new Error(`${vendorType}가 필요합니다.`)
        }
        const vendorNameForTransaction = transactionType === 'SALES' ? row.salesVendorName : row.purchaseVendorName
        
        await prisma.salesRecord.create({
          data: {
            date: transactionDate,
            type: transactionType,
            vendorId: vendorForTransaction.data.id,
            productId: product.data.id,
            salespersonId: salesperson?.data.id || (await getDefaultSalesperson()).id,
            categoryId: category?.data.id || (await getDefaultCategory()).id,
            itemName: row.productName,
            customer: vendorNameForTransaction, // Store vendor name in customer field for backward compatibility
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
 * Handle Service category entry
 */
async function handleServiceEntry(row: any, summary: any, options: UploadOptions) {
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
    if (category?.isNew) summary.categoriesCreated++
  }
  
  // Find or create service
  const existingService = await prisma.service.findFirst({
    where: { name: row.productName }
  })
  
  if (existingService) {
    // Update service with non-blank fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (row.serviceHours && row.serviceHours > 0) {
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
    const code = `S${Date.now().toString().slice(-6)}`
    await prisma.service.create({
      data: {
        code,
        name: row.productName,
        description: row.description || null,
        serviceHours: row.serviceHours && row.serviceHours > 0 ? row.serviceHours : null,
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
async function handleProjectEntry(row: any, summary: any, options: UploadOptions) {
  // Find or create project
  const existingProject = await prisma.project.findFirst({
    where: { name: row.productName }
  })
  
  if (existingProject) {
    // Update project with non-blank fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (row.salesVendorName) {
      updateData.customer = row.salesVendorName
    }
    if (row.unitPrice && row.unitPrice > 0) {
      updateData.salesPrice = row.unitPrice * (row.quantity || 1)
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
    const code = `P${Date.now().toString().slice(-6)}`
    const startDate = row.date ? new Date(row.date) : new Date()
    const salesPrice = (row.unitPrice || 0) * (row.quantity || 1)
    
    await prisma.project.create({
      data: {
        code,
        name: row.productName,
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
