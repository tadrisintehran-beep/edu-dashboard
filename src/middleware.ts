import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // فقط محافظت از dashboard — بدون چک لاگین بودن
  const allCookies = request.cookies.getAll()
  const hasAuth = allCookies.some(c => 
    c.name.includes('sb-') || 
    c.name.includes('supabase') ||
    c.name.includes('auth')
  )

  // اگه لاگین نکرده و داره میره به dashboard
  if (!hasAuth && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}