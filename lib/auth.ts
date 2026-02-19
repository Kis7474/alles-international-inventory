import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const SESSION_COOKIE_NAME = 'session_token'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type AuthUser = {
  sessionId: string
  rawToken: string
  user: {
    id: number
    email: string
    name: string
    role: UserRole
    status: string
    salespersonId: number | null
    lastLoginAt: Date | null
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':')
  if (!salt || !originalHash) return false

  const candidate = scryptSync(password, salt, 64)
  const original = Buffer.from(originalHash, 'hex')
  if (candidate.length !== original.length) return false

  return timingSafeEqual(candidate, original)
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip')
}

export async function createSession(userId: number, request: NextRequest) {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = sha256(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
    },
  })

  return { rawToken, expiresAt }
}

export async function deleteSessionByToken(rawToken: string) {
  const tokenHash = sha256(rawToken)
  await prisma.userSession.deleteMany({ where: { tokenHash } })
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!rawToken) return null

  const tokenHash = sha256(rawToken)
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => null)
    return null
  }

  return {
    sessionId: session.id,
    user: session.user,
    rawToken,
  }
}

export async function requireAuth(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      auth: null,
    }
  }

  return { error: null, auth }
}

export async function requireRole(request: NextRequest, allowedRoles: UserRole[]) {
  const result = await requireAuth(request)
  if (result.error || !result.auth) return result

  if (!allowedRoles.includes(result.auth.user.role)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      auth: null,
    }
  }

  return result
}

export function getScopedSalespersonId(auth: AuthUser): number | null {
  if (auth.user.role !== 'STAFF') return null
  return auth.user.salespersonId
}

export function enforceStaffSalespersonOwnership(auth: AuthUser, salespersonId: number | null) {
  if (auth.user.role !== 'STAFF') return { ok: true as const }

  if (!auth.user.salespersonId) {
    return { ok: false as const, error: NextResponse.json({ error: 'STAFF 계정에 담당자 매핑이 필요합니다.' }, { status: 403 }) }
  }

  if (salespersonId !== auth.user.salespersonId) {
    return { ok: false as const, error: NextResponse.json({ error: '본인 담당 데이터만 처리할 수 있습니다.' }, { status: 403 }) }
  }

  return { ok: true as const }
}

export function setSessionCookie(response: NextResponse, rawToken: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
