import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getUserPages,
  getInstagramAccount,
} from '@/lib/facebook'

export async function GET(req: NextRequest) {
  const settingsUrl = new URL('/settings', req.url)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state') ?? ''
  const errorParam = req.nextUrl.searchParams.get('error')

  if (errorParam) {
    settingsUrl.searchParams.set('error', 'social_denied')
    return NextResponse.redirect(settingsUrl)
  }

  if (!code) {
    settingsUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(settingsUrl)
  }

  // State format: "{platform}|{userId}"
  const [platform, stateUserId] = state.split('|')

  if (stateUserId !== user.id) {
    settingsUrl.searchParams.set('error', 'state_mismatch')
    return NextResponse.redirect(settingsUrl)
  }

  if (platform !== 'instagram' && platform !== 'facebook') {
    settingsUrl.searchParams.set('error', 'invalid_platform')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    // Exchange code → short-lived token → long-lived token
    const shortToken = await exchangeCodeForToken(code)
    const longToken = await getLongLivedToken(shortToken)

    // Get user's Facebook Pages
    const pages = await getUserPages(longToken)

    if (pages.length === 0) {
      settingsUrl.searchParams.set('error', 'no_pages')
      return NextResponse.redirect(settingsUrl)
    }

    // Use the first page (could be improved with a page-selection UI)
    const page = pages[0]

    const { data: profileData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { workspace_id: string } | null
    if (!profile) {
      settingsUrl.searchParams.set('error', 'profile_missing')
      return NextResponse.redirect(settingsUrl)
    }

    if (platform === 'instagram') {
      // Get the Instagram Business Account linked to this page
      const igAccount = await getInstagramAccount(page.id, page.access_token)

      if (!igAccount) {
        settingsUrl.searchParams.set('error', 'no_instagram_account')
        return NextResponse.redirect(settingsUrl)
      }

      // Store with instagram_account_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('social_connections')
        .upsert(
          {
            user_id: user.id,
            workspace_id: profile.workspace_id,
            platform: 'instagram',
            page_id: igAccount.id,
            page_name: igAccount.username ?? igAccount.name,
            access_token: page.access_token,  // page token used for IG API calls
            instagram_account_id: igAccount.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,page_id' }
        )
    } else {
      // Facebook page connection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('social_connections')
        .upsert(
          {
            user_id: user.id,
            workspace_id: profile.workspace_id,
            platform: 'facebook',
            page_id: page.id,
            page_name: page.name,
            access_token: page.access_token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform,page_id' }
        )
    }

    settingsUrl.searchParams.set('connected', platform)
    return NextResponse.redirect(settingsUrl)
  } catch (err) {
    console.error('OAuth callback error:', err)
    settingsUrl.searchParams.set('error', 'oauth_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
