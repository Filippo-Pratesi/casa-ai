import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

/**
 * Handles Supabase email confirmation callback.
 * Supabase redirects here after the user clicks the confirmation link.
 * We exchange the one-time token for a session and set the cookies.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as 'email', token_hash })

    if (!error) {
      // Session is now set via cookies — redirect to the app
      return NextResponse.redirect(new URL(next, req.url))
    }

    console.error('Email confirmation error:', error)
  }

  // On error, redirect to login with a message
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(loginUrl)
}
