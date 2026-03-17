import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFacebookOAuthUrl } from '@/lib/facebook'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const platform = req.nextUrl.searchParams.get('platform')

  if (platform !== 'instagram' && platform !== 'facebook') {
    return NextResponse.json({ error: 'Platform non valida' }, { status: 400 })
  }

  // Use user ID as state (CSRF check in callback)
  const oauthUrl = getFacebookOAuthUrl(platform, user.id)

  return NextResponse.redirect(oauthUrl)
}
