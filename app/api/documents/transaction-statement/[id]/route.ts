import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/documents/transaction-statement/[id] - 거래명세서 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    const statement = await prisma.transactionStatement.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { itemNo: 'asc' }
        }
      }
    })

    if (!statement) {
      return NextResponse.json(
        { error: '거래명세서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(statement)
  } catch (error) {
    console.error('Error fetching transaction statement:', error)
    return NextResponse.json(
      { error: '거래명세서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/transaction-statement/[id] - 거래명세서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
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

    // 금액 계산
    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0)
    const vatAmount = Math.round(subtotal * 0.1)
    const totalAmount = subtotal + vatAmount

    // 기존 품목 삭제 후 새로 생성
    await prisma.transactionStatementItem.deleteMany({
      where: { statementId: id }
    })

    const statement = await prisma.transactionStatement.update({
      where: { id },
      data: {
        deliveryDate: new Date(deliveryDate),
        recipientName,
        recipientRef,
        recipientPhone,
        recipientFax,
        subtotal,
        vatAmount,
        totalAmount,
        paymentTerms,
        bankAccount,
        receiverName,
        receiverSignature,
        items: {
          create: items.map((item: any, index: number) => ({
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

    return NextResponse.json(statement)
  } catch (error) {
    console.error('Error updating transaction statement:', error)
    return NextResponse.json(
      { error: '거래명세서 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/transaction-statement/[id] - 거래명세서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    await prisma.transactionStatement.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction statement:', error)
    return NextResponse.json(
      { error: '거래명세서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
