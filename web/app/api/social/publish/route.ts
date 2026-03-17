import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishToFacebook, publishToInstagram } from '@/lib/facebook'
import type { Listing, GeneratedContent } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { listing_id, platform } = await req.json() as {
    listing_id: string
    platform: 'instagram' | 'facebook'
  }

  if (!listing_id || !platform) {
    return NextResponse.json({ error: 'listing_id e platform sono obbligatori' }, { status: 400 })
  }

  // Load listing
  const { data: rawListing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .single()

  const listing = rawListing as Listing | null

  if (!listing) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (!listing.generated_content) {
    return NextResponse.json({ error: 'Contenuto non ancora generato' }, { status: 400 })
  }

  const content = listing.generated_content as GeneratedContent

  // Load social connection for this user + platform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connData } = await (supabase as any)
    .from('social_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single()

  const conn = connData as {
    page_id: string
    page_name: string | null
    access_token: string
    instagram_account_id: string | null
  } | null

  if (!conn) {
    return NextResponse.json(
      { error: `Account ${platform === 'instagram' ? 'Instagram' : 'Facebook'} non connesso. Vai in Impostazioni per collegarlo.` },
      { status: 400 }
    )
  }

  const { data: profileData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null

  // Create pending social_post record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: postRecord } = await (supabase as any)
    .from('social_posts')
    .insert({
      listing_id,
      user_id: user.id,
      workspace_id: profile?.workspace_id,
      platform,
      status: 'pending',
    })
    .select('id')
    .single()

  const postRecordId = (postRecord as { id: string } | null)?.id

  const photoUrls = listing.photos_urls as string[]

  try {
    let publishedPostId: string

    if (platform === 'instagram') {
      if (!conn.instagram_account_id) {
        throw new Error('Instagram Business Account ID mancante. Riconnetti l\'account.')
      }
      publishedPostId = await publishToInstagram({
        igAccountId: conn.instagram_account_id,
        pageToken: conn.access_token,
        caption: content.instagram,
        photoUrls,
      })
    } else {
      publishedPostId = await publishToFacebook({
        pageId: conn.page_id,
        pageToken: conn.access_token,
        message: content.facebook,
        photoUrls,
      })
    }

    // Update social_post record
    if (postRecordId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('social_posts')
        .update({
          post_id: publishedPostId,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', postRecordId)
    }

    return NextResponse.json({ success: true, post_id: publishedPostId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    console.error(`Social publish error (${platform}):`, err)

    if (postRecordId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('social_posts')
        .update({ status: 'failed', error_message: message })
        .eq('id', postRecordId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
