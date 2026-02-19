import { PrismaClient, UserRole } from '@prisma/client'
import { randomBytes, scryptSync } from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

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

  const salespersonMap = new Map(
    (await prisma.salesperson.findMany({ where: { code: { in: ['BS', 'SJ', 'YR', 'IK'] } } }))
      .filter((s) => s.code)
      .map((s) => [s.code as string, s.id])
  )

  // Seed auth users (2 ADMIN + 2 STAFF)
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin!123'
  const staffPassword = process.env.SEED_STAFF_PASSWORD || 'ChangeMeStaff!123'

  const users: Array<{ email: string; name: string; role: UserRole; salespersonCode: string; password: string }> = [
    { email: 'bs@alles.local', name: 'BS', role: 'ADMIN', salespersonCode: 'BS', password: adminPassword },
    { email: 'sj@alles.local', name: 'SJ', role: 'ADMIN', salespersonCode: 'SJ', password: adminPassword },
    { email: 'yr@alles.local', name: 'YR', role: 'STAFF', salespersonCode: 'YR', password: staffPassword },
    { email: 'ik@alles.local', name: 'IK', role: 'STAFF', salespersonCode: 'IK', password: staffPassword },
  ]

  console.log('Creating auth users...')
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        status: 'ACTIVE',
        passwordHash: hashPassword(user.password),
        salespersonId: salespersonMap.get(user.salespersonCode),
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        status: 'ACTIVE',
        passwordHash: hashPassword(user.password),
        salespersonId: salespersonMap.get(user.salespersonCode),
      },
    })
  }
  console.log('✅ Auth users created (4 accounts)')

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
    { code: 'V001', name: '한국인쇄(주)', type: 'DOMESTIC', contactPerson: null, phone: '02-123-4567', email: null, address: '서울시 강남구', country: null, currency: null, memo: '주요 거래처' },
    { code: 'V002', name: 'ABC 무역', type: 'DOMESTIC', contactPerson: null, phone: '031-987-6543', email: null, address: '경기도 성남시', country: null, currency: null, memo: null },
    { code: 'V003', name: '글로벌 프린팅', type: 'DOMESTIC', contactPerson: null, phone: '02-555-7777', email: null, address: '서울시 마포구', country: null, currency: null, memo: null },
  ]

  console.log('Creating vendors...')
  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { code: vendor.code },
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
