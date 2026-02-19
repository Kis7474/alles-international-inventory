import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, requireAuth, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { error, auth } = await requireAuth(request)
    if (error || !auth) return error

    const body = await request.json()
    const currentPassword = String(body?.currentPassword || '')
    const newPassword = String(body?.newPassword || '')

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 입력하세요.' }, { status: 400 })
    }

    if (newPassword.length < 10) {
      return NextResponse.json({ error: '새 비밀번호는 10자 이상이어야 합니다.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: auth.user.id } })
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    if (verifyPassword(newPassword, user.passwordHash)) {
      return NextResponse.json({ error: '새 비밀번호가 기존 비밀번호와 같습니다.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: '비밀번호 변경에 실패했습니다.' }, { status: 500 })
  }
}
