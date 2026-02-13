import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

const SESSION_COOKIE_NAME = 'session_token'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

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

export async function getAuthUser(request: NextRequest) {
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
