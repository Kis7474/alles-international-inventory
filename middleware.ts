import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminOnlyPath } from '@/lib/access-control'

const PUBLIC_API_PATHS = new Set(['/api/auth/login'])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/public') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const shouldProtect =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/sales') ||
    pathname.startsWith('/import-export') ||
    pathname.startsWith('/warehouse') ||
    pathname.startsWith('/master') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/services') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/settings')

  if (!shouldProtect) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session_token')?.value
  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/projects/new')) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }

  // NOTE: middleware cannot reliably access DB role at Edge runtime.
  // Admin-only pages are hidden in UI by role and validated in API endpoints.
  if (isAdminOnlyPath(pathname) && pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
}
