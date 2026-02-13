import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { error, auth } = await requireAuth(request)
  if (error || !auth) return error

  return NextResponse.json({
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role,
      status: auth.user.status,
      lastLoginAt: auth.user.lastLoginAt,
    },
  })
}
