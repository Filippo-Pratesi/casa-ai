/**
 * Facebook Graph API client for Instagram Business + Facebook Pages publishing.
 *
 * Setup required (Meta Developer Console → https://developers.facebook.com):
 * 1. Create a Facebook App (type: Business)
 * 2. Add products: Facebook Login + Instagram Graph API
 * 3. Add permissions: pages_manage_posts, pages_read_engagement, pages_show_list,
 *    instagram_basic, instagram_content_publish
 * 4. Set Valid OAuth Redirect URIs: {NEXT_PUBLIC_APP_URL}/api/social/callback
 * 5. Copy App ID + App Secret to .env.local
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'

export function getFacebookOAuthUrl(platform: 'instagram' | 'facebook', state: string): string {
  const appId = process.env.FACEBOOK_APP_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback`

  const scopeMap = {
    instagram: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    facebook: 'pages_manage_posts,pages_read_engagement,pages_show_list',
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopeMap[platform],
    response_type: 'code',
    state: `${platform}|${state}`,
  })

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback`,
    code,
  })

  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`)
  const data = await res.json()

  if (!res.ok || !data.access_token) {
    throw new Error(`Errore autenticazione Facebook: ${data?.error?.message ?? 'errore sconosciuto'}`)
  }

  return data.access_token
}

export async function getLongLivedToken(shortLivedToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`)
  const data = await res.json()

  if (!res.ok || !data.access_token) {
    throw new Error(`Errore rinnovo token Facebook: ${data?.error?.message ?? 'errore sconosciuto'}`)
  }

  return data.access_token
}

interface FacebookPage {
  id: string
  name: string
  access_token: string
}

export async function getUserPages(userToken: string): Promise<FacebookPage[]> {
  const res = await fetch(
    `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token&access_token=${userToken}`
  )
  const data = await res.json()

  if (!res.ok) {
    throw new Error(`Errore recupero pagine Facebook: ${data?.error?.message ?? 'errore sconosciuto'}`)
  }

  return (data.data ?? []) as FacebookPage[]
}

interface InstagramAccount {
  id: string
  name: string
  username: string
}

export async function getInstagramAccount(pageId: string, pageToken: string): Promise<InstagramAccount | null> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account{id,name,username}&access_token=${pageToken}`
  )
  const data = await res.json()

  if (!res.ok) return null

  return data.instagram_business_account ?? null
}

// ─── Publishing ──────────────────────────────────────────────────────────────

export async function publishToFacebook(params: {
  pageId: string
  pageToken: string
  message: string
  photoUrls: string[]
}): Promise<string> {
  const { pageId, pageToken, message, photoUrls } = params

  if (photoUrls.length === 0) {
    // Text-only post
    const res = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageToken }),
    })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error(`Errore pubblicazione Facebook: ${data?.error?.message ?? 'errore sconosciuto'}`)
    return data.id as string
  }

  // Upload photos first (unpublished), then create post with attached_media
  const uploadedPhotoIds: string[] = []

  for (const url of photoUrls.slice(0, 10)) {
    const res = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, published: false, access_token: pageToken }),
    })
    const data = await res.json()
    if (res.ok && data.id) uploadedPhotoIds.push(data.id as string)
  }

  const attachedMedia = uploadedPhotoIds.map((id) => ({ media_fbid: id }))

  const res = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      attached_media: attachedMedia,
      access_token: pageToken,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(`Errore pubblicazione Facebook: ${data?.error?.message ?? 'errore sconosciuto'}`)

  return data.id as string
}

export async function publishToInstagram(params: {
  igAccountId: string
  pageToken: string
  caption: string
  photoUrls: string[]
}): Promise<string> {
  const { igAccountId, pageToken, caption, photoUrls } = params

  if (photoUrls.length === 0) {
    throw new Error('Instagram requires at least one photo')
  }

  if (photoUrls.length === 1) {
    // Single image post
    const createRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: photoUrls[0],
        caption,
        access_token: pageToken,
      }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.id) {
      throw new Error(`Errore creazione media Instagram: ${createData?.error?.message ?? 'errore sconosciuto'}`)
    }

    const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: createData.id, access_token: pageToken }),
    })
    const publishData = await publishRes.json()
    if (!publishRes.ok || !publishData.id) {
      throw new Error(`Errore pubblicazione Instagram: ${publishData?.error?.message ?? 'errore sconosciuto'}`)
    }

    return publishData.id as string
  }

  // Carousel post (multiple images)
  const childIds: string[] = []

  for (const url of photoUrls.slice(0, 10)) {
    const res = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: pageToken,
      }),
    })
    const data = await res.json()
    if (res.ok && data.id) childIds.push(data.id as string)
  }

  const carouselRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
      access_token: pageToken,
    }),
  })
  const carouselData = await carouselRes.json()
  if (!carouselRes.ok || !carouselData.id) {
    throw new Error(`Errore creazione carosello Instagram: ${carouselData?.error?.message ?? 'errore sconosciuto'}`)
  }

  const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: pageToken }),
  })
  const publishData = await publishRes.json()
  if (!publishRes.ok || !publishData.id) {
    throw new Error(`Errore pubblicazione carosello Instagram: ${publishData?.error?.message ?? 'errore sconosciuto'}`)
  }

  return publishData.id as string
}
