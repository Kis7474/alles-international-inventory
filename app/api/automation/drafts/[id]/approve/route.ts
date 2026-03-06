import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

async function getDefaults() {
  const [salesperson, category] = await Promise.all([
    prisma.salesperson.findFirst({ orderBy: { id: 'asc' } }),
    prisma.category.findFirst({ orderBy: { id: 'asc' } }),
  ])

  if (!salesperson || !category) {
    throw new Error('기본 담당자/카테고리가 필요합니다.')
  }

  return { salespersonId: salesperson.id, categoryId: category.id }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, auth } = await requireRole(request, ['ADMIN'])
  if (error || !auth) return error

  try {
    const defaults = await getDefaults()

    const result = await prisma.$transaction(async (tx) => {
      const draft = await tx.automationDraft.findUnique({
        where: { id: params.id },
        include: { lines: true },
      })

      if (!draft) {
        throw new Error('draft not found')
      }
      if (draft.status !== 'DRAFT') {
        throw new Error(`draft status ${draft.status} cannot be approved`)
      }

      const salesRecords: number[] = []

      for (const line of draft.lines) {
        if (!line.matchedProductId) {
          continue
        }

        const amount = line.quantity * line.unitPrice

        const sales = await tx.salesRecord.create({
          data: {
            date: draft.statementDate || new Date(),
            type: 'SALES',
            salespersonId: defaults.salespersonId,
            categoryId: defaults.categoryId,
            productId: line.matchedProductId,
            itemName: line.rawItemName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount,
            cost: 0,
            margin: amount,
            marginRate: 100,
            costSource: 'MANUAL',
            notes: `auto draft ${draft.id} approved by ${auth.user.name}`,
          },
        })

        await tx.inventoryMovement.create({
          data: {
            movementDate: draft.statementDate || new Date(),
            productId: line.matchedProductId,
            type: 'OUT',
            quantity: line.quantity,
            unitCost: 0,
            totalCost: 0,
            refType: 'AUTOMATION_DRAFT_APPROVE',
            refId: draft.id,
            salesRecordId: sales.id,
            outboundType: 'SALES',
            notes: '자동화 Draft 승인으로 생성',
          },
        })

        salesRecords.push(sales.id)
      }

      const updated = await tx.automationDraft.update({
        where: { id: draft.id },
        data: {
          status: 'POSTED',
          approvedById: auth.user.id,
          approvedAt: new Date(),
          postedAt: new Date(),
        },
      })

      await tx.auditLog.create({
        data: {
          userId: auth.user.id,
          action: 'APPROVE_DRAFT',
          resource: 'AutomationDraft',
          resourceId: draft.id,
          metadata: JSON.stringify({ salesRecordIds: salesRecords }),
        },
      })

      return updated
    })

    return NextResponse.json({ success: true, draft: result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed to approve draft' }, { status: 400 })
  }
}
