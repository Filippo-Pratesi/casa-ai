import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateListingContent } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })

    const { listing, photoUrls } = await req.json()

    // Download photos server-side and convert to base64 for Gemini
    const photoBlobs: { data: string; mimeType: string }[] = []
    const uploadedUrls: string[] = []

    for (let i = 0; i < (photoUrls as string[]).length; i++) {
      const url = photoUrls[i]
      const res = await fetch(url)
      if (!res.ok) continue
      const buffer = await res.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const mimeType = res.headers.get('content-type') ?? 'image/jpeg'

      photoBlobs.push({ data: base64, mimeType })

      // Upload to Supabase Storage
      const filename = `${user.id}/${Date.now()}_${i}.jpg`
      const { data: uploadData } = await supabase.storage
        .from('listings')
        .upload(filename, Buffer.from(buffer), { contentType: mimeType, upsert: false })

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(filename)
        uploadedUrls.push(publicUrl)
      }
    }

    // Generate content with Gemini (best-effort — save draft even if quota exhausted)
    let generatedContent = null
    let geminiError: string | null = null
    try {
      generatedContent = await generateListingContent(listing, photoBlobs)
    } catch (err) {
      geminiError = String(err)
      console.warn('Gemini generation failed, saving draft without content:', geminiError)
    }

    // Save listing to DB — explicitly pick allowed fields to prevent mass-assignment
    const allowedListing = {
      property_type: listing.property_type,
      address: listing.address,
      city: listing.city,
      neighborhood: listing.neighborhood ?? null,
      price: listing.price,
      sqm: listing.sqm,
      rooms: listing.rooms,
      bathrooms: listing.bathrooms,
      floor: listing.floor ?? null,
      total_floors: listing.total_floors ?? null,
      features: Array.isArray(listing.features) ? listing.features : [],
      notes: listing.notes ?? null,
      tone: listing.tone ?? 'standard',
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedListing, error } = await (supabase as any)
      .from('listings')
      .insert({
        workspace_id: profile.workspace_id,
        agent_id: user.id,
        ...allowedListing,
        photos_urls: uploadedUrls,
        vision_labels: [],
        generated_content: generatedContent,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      listing_id: savedListing.id,
      generated_content: generatedContent,
      ...(geminiError ? { warning: 'Contenuto non generato: quota Gemini esaurita. Riprova più tardi.', gemini_error: geminiError } : {}),
    })
  } catch (err) {
    console.error('generate-from-urls error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
