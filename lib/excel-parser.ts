import ExcelJS from 'exceljs'

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

export interface TransactionRow {
  date: string           // 날짜
  type: string           // 구분 (매출/매입)
  vendorName: string     // 거래처
  productName: string    // 품목명
  quantity: number       // 수량
  unitPrice: number      // 단가
  totalWithVat: number   // 금액(부가세포함)
  totalAmount: number    // 금액
  salesperson: string    // 담당자
  category: string       // 카테고리
  margin: number         // 마진
  marginRate: string     // 마진율
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
  const workbook = new ExcelJS.Workbook()
  
  // Load workbook from buffer
  await workbook.xlsx.load(buffer)
  
  // Get first worksheet
  const worksheet = workbook.worksheets[0]
  
  if (!worksheet) {
    throw new Error('파일에 워크시트가 없습니다.')
  }
  
  const data: (string | number)[][] = []
  
  // Convert worksheet to array format
  worksheet.eachRow((row) => {
    const rowData: (string | number)[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value
      if (value === null || value === undefined) {
        rowData.push('')
      } else if (typeof value === 'number') {
        rowData.push(value)
      } else if (typeof value === 'string') {
        rowData.push(value)
      } else {
        // Handle other cell types (formulas, dates, etc.)
        rowData.push(String(value))
      }
    })
    data.push(rowData)
  })
  
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
      const salesPrice = typeof row[1 + prodIdx * 2] === 'number' ? row[1 + prodIdx * 2] as number : null
      const purchasePrice = typeof row[2 + prodIdx * 2] === 'number' ? row[2 + prodIdx * 2] as number : null
      
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
 * Parse Excel/CSV file for transaction data
 * Expected format:
 * Row 1: 날짜 | 구분 | 거래처 | 품목명 | 수량 | 단가 | 금액(부가세포함) | 금액 | 담당자 | 카테고리 | 마진 | 마진율
 * Row 2+: Data rows
 */
export async function parseTransactionExcel(file: File): Promise<TransactionRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  
  // Load workbook from buffer
  await workbook.xlsx.load(buffer)
  
  // Get first worksheet
  const worksheet = workbook.worksheets[0]
  
  if (!worksheet) {
    throw new Error('파일에 워크시트가 없습니다.')
  }
  
  const rows: TransactionRow[] = []
  let isFirstRow = true
  
  // Convert worksheet to array format
  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (isFirstRow) {
      isFirstRow = false
      return
    }
    
    const cells: (Date | number | string | null | undefined)[] = []
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.value as Date | number | string | null | undefined)
    })
    
    // Skip empty rows
    if (cells.every(cell => !cell)) {
      return
    }
    
    try {
      const transactionRow: TransactionRow = {
        date: parseDateValue(cells[0]),
        type: String(cells[1] || '').trim(),
        vendorName: String(cells[2] || '').trim(),
        productName: String(cells[3] || '').trim(),
        quantity: parseNumberValue(cells[4]),
        unitPrice: parseNumberValue(cells[5]),
        totalWithVat: parseNumberValue(cells[6]),
        totalAmount: parseNumberValue(cells[7]),
        salesperson: String(cells[8] || '').trim(),
        category: String(cells[9] || '').trim(),
        margin: parseNumberValue(cells[10]),
        marginRate: String(cells[11] || '').trim(),
      }
      
      rows.push(transactionRow)
    } catch (error) {
      console.error(`Error parsing row ${rowNumber}:`, error)
      // Skip invalid rows
    }
  })
  
  return rows
}

/**
 * Parse date value from Excel cell
 * Supports: Date objects, Excel serial numbers, and string formats (2024-01-15, 2024.01.15, 2024/01/15)
 */
function parseDateValue(value: Date | number | string | null | undefined): string {
  if (!value) {
    throw new Error('날짜가 비어있습니다.')
  }
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  
  // If it's an Excel serial number (number)
  if (typeof value === 'number') {
    const date = excelSerialToDate(value)
    return date.toISOString().split('T')[0]
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Replace various separators with hyphen
    const normalized = value.replace(/[.\/]/g, '-')
    const date = new Date(normalized)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  
  throw new Error(`날짜 형식 오류: ${value}`)
}

/**
 * Convert Excel serial number to Date
 */
function excelSerialToDate(serial: number): Date {
  // Excel's epoch is 1900-01-01, but Excel has a bug where it treats 1900 as a leap year
  const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * 86400000) // 86400000 ms in a day
  return date
}

/**
 * Parse number value from Excel cell
 */
function parseNumberValue(value: Date | number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  
  if (typeof value === 'number') {
    return value
  }
  
  if (typeof value === 'string') {
    // Remove common separators and parse
    const cleaned = value.replace(/[,\s%]/g, '')
    const num = parseFloat(cleaned)
    if (!isNaN(num)) {
      return num
    }
  }
  
  return 0
}

/**
 * Generate a unique code from a name
 */
export function generateCode(name: string): string {
  // Remove special characters and spaces, take first 8 characters
  const cleaned = name.replace(/[^a-zA-Z0-9가-힣]/g, '').toUpperCase()
  const base = cleaned.substring(0, 8)
  const timestamp = Date.now().toString(36).slice(-4)
  const random = Math.random().toString(36).substring(2, 6)
  return `${base}-${timestamp}${random}`
}
