import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error) return error

  const draft = await prisma.automationDraft.findUnique({
    where: { id: params.id },
    include: {
      document: true,
      approvedBy: { select: { id: true, name: true, email: true } },
      lines: {
        include: {
          matchedProduct: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { lineNo: 'asc' },
      },
    },
  })

  if (!draft) {
    return NextResponse.json({ error: 'draft not found' }, { status: 404 })
  }

  return NextResponse.json(draft)
}
