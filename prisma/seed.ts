import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Seed Salespersons
  const salespersons = [
    { code: 'BS', name: 'BS', commissionRate: 0 },
    { code: 'IK', name: 'IK', commissionRate: 0.15 }, // IK gets 15% commission
    { code: 'YR', name: 'YR', commissionRate: 0 },
    { code: 'SJ', name: 'SJ', commissionRate: 0 },
  ]

  console.log('Creating salespersons...')
  for (const person of salespersons) {
    await prisma.salesperson.upsert({
      where: { code: person.code },
      update: {},
      create: person,
    })
  }
  console.log('✅ Salespersons created')

  // Seed Product Categories
  const categories = [
    { code: 'MACHINE', name: 'Machine', nameKo: '기계' },
    { code: 'PARTS', name: 'Parts', nameKo: '부품' },
    { code: 'FOUNT', name: 'Fount', nameKo: '약물 및 습수액' },
    { code: 'WASH', name: 'Wash', nameKo: '세척관련' },
    { code: 'CTP', name: 'CTP', nameKo: '판 및 판부자재' },
    { code: 'INK', name: 'Ink', nameKo: '잉크' },
    { code: 'FILM', name: 'Film', nameKo: '필름' },
    { code: 'SERVICE', name: 'Service', nameKo: '인건비' },
    { code: 'BLANKET', name: 'Blanket', nameKo: '블랑켓' },
    { code: 'ROLLER', name: 'Roller', nameKo: '롤러' },
    { code: 'UV_LAMP', name: 'UV Lamp', nameKo: '램프' },
    { code: 'OTHERS', name: 'Others', nameKo: '기타부자재' },
    { code: 'FILTER', name: 'Filter', nameKo: '필터' },
  ]

  console.log('Creating product categories...')
  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { code: category.code },
      update: {},
      create: category,
    })
  }
  console.log('✅ Product categories created')

  // Seed Vendors
  const vendors = [
    { name: '한국인쇄(주)', contact: '02-123-4567', address: '서울시 강남구', notes: '주요 거래처' },
    { name: 'ABC 무역', contact: '031-987-6543', address: '경기도 성남시', notes: null },
    { name: '글로벌 프린팅', contact: '02-555-7777', address: '서울시 마포구', notes: null },
  ]

  console.log('Creating vendors...')
  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { name: vendor.name },
      update: {},
      create: vendor,
    })
  }
  console.log('✅ Vendors created')

  // Seed Sales Products with Price History
  const products = [
    {
      name: 'Blanket - Heidelberg 102',
      description: '하이델베르그 102용 블랑켓',
      unit: 'EA',
      notes: null,
      prices: [
        { effectiveDate: new Date('2024-01-01'), purchasePrice: 100000, salesPrice: 150000 },
        { effectiveDate: new Date('2024-03-01'), purchasePrice: 120000, salesPrice: 180000 },
      ],
    },
    {
      name: 'UV Lamp - 1000W',
      description: '1000W UV 램프',
      unit: 'EA',
      notes: null,
      prices: [
        { effectiveDate: new Date('2024-01-01'), purchasePrice: 50000, salesPrice: 75000 },
      ],
    },
    {
      name: 'Fountain Solution - Premium',
      description: '프리미엄 습수액',
      unit: 'L',
      notes: null,
      prices: [
        { effectiveDate: new Date('2024-01-01'), purchasePrice: 5000, salesPrice: 8000 },
        { effectiveDate: new Date('2024-02-01'), purchasePrice: 6000, salesPrice: 9000 },
      ],
    },
    {
      name: 'Roller - Standard',
      description: '표준 롤러',
      unit: 'EA',
      notes: null,
      prices: [
        { effectiveDate: new Date('2024-01-01'), purchasePrice: 80000, salesPrice: 120000 },
      ],
    },
  ]

  console.log('Creating sales products with price history...')
  for (const product of products) {
    const existing = await prisma.salesProduct.findUnique({
      where: { name: product.name },
    })

    if (!existing) {
      await prisma.salesProduct.create({
        data: {
          name: product.name,
          description: product.description,
          unit: product.unit,
          notes: product.notes,
          prices: {
            create: product.prices,
          },
        },
      })
    }
  }
  console.log('✅ Sales products with price history created')

  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
