import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function updateSession(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL ?? '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/invite']
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))

  // Helper: redirect while preserving refreshed session cookies
  function redirectWith(pathname: string) {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie as Parameters<typeof res.cookies.set>[2])
    })
    return res
  }

  if (!user && !isPublicRoute) return redirectWith('/login')
  if (user && isPublicRoute) return redirectWith('/dashboard')

  // Add CORS headers to all API responses
  if (request.nextUrl.pathname.startsWith('/api/')) {
    supabaseResponse.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL ?? '*')
    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  }

  return supabaseResponse
}
