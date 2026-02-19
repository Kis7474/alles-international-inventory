import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_API_PATHS = new Set(['/api/auth/login'])
const PUBLIC_PAGE_PATHS = new Set(['/login'])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.startsWith('/public') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session_token')?.value

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  const shouldProtect = pathname.startsWith('/api/') || !pathname.startsWith('/api/')

  if (!shouldProtect) {
    return NextResponse.next()
  }

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
