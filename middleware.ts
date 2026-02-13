import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_API_PATHS = new Set(['/api/auth/login'])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/public') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Keep auth login API public
  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  // Protect API routes and key app pages by session cookie presence
  const shouldProtect = pathname.startsWith('/api/') || pathname.startsWith('/sales') || pathname.startsWith('/import-export') || pathname.startsWith('/warehouse') || pathname.startsWith('/master')

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
}
