import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // چک کردن کوکی session سوپابیس
  const hasSession =
    request.cookies.has('sb-cjnyixoffbgsiesezkgc-auth-token') ||
    request.cookies.has('sb-access-token') ||
    request.cookies.getAll().some(c => c.name.includes('sb-') && c.name.includes('auth'))

  // اگه لاگین نکرده و داره میره به dashboard
  if (!hasSession && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // اگه لاگین کرده و داره میره به صفحه لاگین
  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
}