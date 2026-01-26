import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDocumentNumber, calculateVAT } from '@/lib/document-utils'

// GET /api/documents/transaction-statement - 거래명세서 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('perPage') || '20')
    const skip = (page - 1) * perPage

    const [statements, total] = await Promise.all([
      prisma.transactionStatement.findMany({
        include: {
          items: {
            orderBy: { itemNo: 'asc' }
          }
        },
        orderBy: { deliveryDate: 'desc' },
        skip,
        take: perPage,
      }),
      prisma.transactionStatement.count(),
    ])

    return NextResponse.json({
      data: statements,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('Error fetching transaction statements:', error)
    return NextResponse.json(
      { error: '거래명세서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/documents/transaction-statement - 거래명세서 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      deliveryDate,
      recipientName,
      recipientRef,
      recipientPhone,
      recipientFax,
      items,
      paymentTerms,
      bankAccount,
      receiverName,
      receiverSignature,
    } = body

    // 거래번호 생성
    const lastStatement = await prisma.transactionStatement.findFirst({
      orderBy: { statementNumber: 'desc' }
    })
    const statementNumber = generateDocumentNumber('TS', lastStatement?.statementNumber || null)

    // 금액 계산
    const subtotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
    const { vatAmount, totalAmount } = calculateVAT(subtotal)

    // 거래명세서 생성
    const statement = await prisma.transactionStatement.create({
      data: {
        statementNumber,
        deliveryDate: new Date(deliveryDate),
        recipientName,
        recipientRef,
        recipientPhone,
        recipientFax,
        subtotal,
        vatAmount,
        totalAmount,
        paymentTerms: paymentTerms || '납품 후 익월 현금결제',
        bankAccount: bankAccount || '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)',
        receiverName,
        receiverSignature,
        items: {
          create: items.map((item: { productName: string; specification?: string; quantity: number; unitPrice: number; amount: number }, index: number) => ({
            itemNo: index + 1,
            productName: item.productName,
            specification: item.specification,
            quantity: item.quantity,
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

    return NextResponse.json(statement, { status: 201 })
  } catch (error) {
    console.error('Error creating transaction statement:', error)
    return NextResponse.json(
      { error: '거래명세서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
