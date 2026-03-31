import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro']

export function middleware(request: NextRequest) {
  try {
    const token = request.cookies.get('access_token')?.value
    const { pathname } = request.nextUrl
    const isPublic = PUBLIC_ROUTES.includes(pathname)

    if (!token && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (token && isPublic) {
      return NextResponse.redirect(new URL('/animais', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    // Em caso de erro no middleware, redireciona para login
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp).*)',
  ],
}
