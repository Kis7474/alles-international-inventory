import * as XLSX from 'xlsx'

export interface ParsedData {
  vendors: string[]
  products: string[]
  prices: Array<{
    vendorName: string
    productName: string
    salesPrice: number | null
    purchasePrice: number | null
  }>
}

/**
 * Parse Excel/CSV file for vendor-product price data
 * Expected format:
 * Row 1: Customer | Product1 | Product1 | Product2 | Product2 | ...
 * Row 2:         | 매출     | 매입     | 매출     | 매입     | ...
 * Row 3+: VendorName | price | price | price | price | ...
 */
export async function parseExcelFile(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][]
  
  if (data.length < 2) {
    throw new Error('파일에 데이터가 충분하지 않습니다.')
  }
  
  // First row: product names (2개씩 묶여있음)
  const headerRow = data[0]
  
  // Extract product names (columns 1, 3, 5, ... are product names)
  const products: string[] = []
  for (let i = 1; i < headerRow.length; i += 2) {
    const productName = String(headerRow[i] || '').trim()
    if (productName) {
      products.push(productName)
    }
  }
  
  // Extract vendor names and prices (from row 2 onwards, skip row 1 which might be labels)
  const vendors: string[] = []
  const prices: ParsedData['prices'] = []
  
  // Determine if row 1 is a label row (매출/매입)
  const startRow = data.length > 1 && String(data[1][1] || '').includes('매출') ? 2 : 1
  
  for (let rowIdx = startRow; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx]
    const vendorName = String(row[0] || '').trim()
    
    if (!vendorName) continue
    vendors.push(vendorName)
    
    // Extract prices for each product
    for (let prodIdx = 0; prodIdx < products.length; prodIdx++) {
      const salesPrice = row[1 + prodIdx * 2] as number || null
      const purchasePrice = row[2 + prodIdx * 2] as number || null
      
      prices.push({
        vendorName,
        productName: products[prodIdx],
        salesPrice,
        purchasePrice,
      })
    }
  }
  
  return { vendors, products, prices }
}

/**
 * Generate a unique code from a name
 */
export function generateCode(name: string): string {
  // Remove special characters and spaces, take first 8 characters
  const cleaned = name.replace(/[^a-zA-Z0-9가-힣]/g, '').toUpperCase()
  const base = cleaned.substring(0, 8)
  const timestamp = Date.now().toString(36).substring(-4)
  return `${base}-${timestamp}`
}
