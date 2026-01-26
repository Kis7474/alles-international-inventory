import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/documents/quotation - 견적서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '20')
    const skip = (page - 1) * perPage

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        include: {
          items: {
            orderBy: { itemNo: 'asc' }
          }
        },
        orderBy: { quotationDate: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.quotation.count(),
    ])

    return NextResponse.json({
      data: quotations,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('Error fetching quotations:', error)
    return NextResponse.json(
      { error: '견적서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/documents/quotation - 견적서 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      quotationDate,
      validUntil,
      customerName,
      customerRef,
      customerPhone,
      customerFax,
      customerEmail,
      salesPersonName,
      salesPersonPhone,
      items,
      deliveryTerms,
      paymentTerms,
      validityPeriod,
      notes,
    } = body

    // 견적서 번호 생성 (AQ + YYMMDD + 순번)
    const today = new Date()
    const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6) // YYMMDD
    const prefix = `AQ${dateStr}`
    
    // 오늘 날짜의 마지막 견적서 찾기
    const lastQuotation = await prisma.quotation.findFirst({
      where: {
        quotationNumber: {
          startsWith: prefix
        }
      },
      orderBy: { quotationNumber: 'desc' }
    })

    let sequence = 1
    if (lastQuotation) {
      const lastSeq = parseInt(lastQuotation.quotationNumber.slice(-2))
      sequence = lastSeq + 1
    }

    const quotationNumber = `${prefix}${sequence.toString().padStart(2, '0')}`

    // 금액 계산
    const subtotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
    const vatAmount = Math.round(subtotal * 0.1)
    const totalAmount = subtotal + vatAmount

    // 견적서 생성
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        quotationDate: new Date(quotationDate),
        validUntil: validUntil ? new Date(validUntil) : null,
        customerName,
        customerRef,
        customerPhone,
        customerFax,
        customerEmail,
        salesPersonName,
        salesPersonPhone,
        subtotal,
        vatAmount,
        totalAmount,
        deliveryTerms,
        paymentTerms,
        validityPeriod,
        notes,
        items: {
          create: items.map((item: { description: string; quantity: number; unit?: string; unitPrice: number; amount: number }, index: number) => ({
            itemNo: index + 1,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'EA',
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: {
          orderBy: { itemNo: 'asc' }
        }
      }
    })

    return NextResponse.json(quotation, { status: 201 })
  } catch (error) {
    console.error('Error creating quotation:', error)
    return NextResponse.json(
      { error: '견적서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
