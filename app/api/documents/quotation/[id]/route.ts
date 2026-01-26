import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/documents/quotation/[id] - 견적서 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { itemNo: 'asc' }
        }
      }
    })

    if (!quotation) {
      return NextResponse.json(
        { error: '견적서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error fetching quotation:', error)
    return NextResponse.json(
      { error: '견적서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/documents/quotation/[id] - 견적서 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
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

    // 금액 계산
    const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0)
    const vatAmount = Math.round(subtotal * 0.1)
    const totalAmount = subtotal + vatAmount

    // 기존 품목 삭제 후 새로 생성
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id }
    })

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
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
          create: items.map((item: any, index: number) => ({
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

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error updating quotation:', error)
    return NextResponse.json(
      { error: '견적서 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/quotation/[id] - 견적서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)

    await prisma.quotation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quotation:', error)
    return NextResponse.json(
      { error: '견적서 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
