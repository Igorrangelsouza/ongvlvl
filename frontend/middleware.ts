import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const isPublic = PUBLIC_ROUTES.includes(request.nextUrl.pathname)

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/animais', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|.*\\.).*)'],
}
