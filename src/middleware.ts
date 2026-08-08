import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/project']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('next-auth.session-token')

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/project/:path*', '/api/projects/:path*', '/api/tasks/:path*', '/api/activities/:path*', '/api/notifications/:path*'],
}
