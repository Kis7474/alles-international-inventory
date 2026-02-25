import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const accessByRole = {
  ADMIN: {
    canAccess: 'ALL',
    restricted: [],
  },
  STAFF: {
    canAccess: '업무 기능 대부분',
    restricted: ['/settings/unipass', '/master/upload'],
  },
}

export async function GET(request: NextRequest) {
  const { error, auth } = await requireAuth(request)
  if (error || !auth) return error

  return NextResponse.json({
    role: auth.user.role,
    access: accessByRole[auth.user.role],
  })
}
