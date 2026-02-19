import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, deleteSessionByToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get('session_token')?.value
    if (rawToken) {
      await deleteSessionByToken(rawToken)
    }

    const response = NextResponse.json({ success: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
