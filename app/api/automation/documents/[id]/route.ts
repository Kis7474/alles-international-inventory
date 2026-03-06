import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error) return error

  const doc = await prisma.automationDocument.findUnique({
    where: { id: params.id },
    include: {
      drafts: {
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!doc) return NextResponse.json({ error: 'document not found' }, { status: 404 })

  return NextResponse.json(doc)
}
