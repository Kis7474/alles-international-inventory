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
