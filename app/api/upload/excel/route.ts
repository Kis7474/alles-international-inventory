import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseExcelFile, generateCode } from '@/lib/excel-parser'

interface UploadOptions {
  duplicateHandling: 'overwrite' | 'skip' | 'merge'
  createVendors: boolean
  createProducts: boolean
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
    }
    
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
          await prisma.product.create({
            data: {
              code: generateCode(productName),
              name: productName,
              unit: '개',
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
    console.error('Error uploading Excel file:', error)
    return NextResponse.json(
      { error: `파일 업로드 중 오류가 발생했습니다: ${error}` },
      { status: 500 }
    )
  }
}
