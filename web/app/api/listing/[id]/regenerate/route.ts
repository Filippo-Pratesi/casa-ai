import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { regenerateTab } from '@/lib/deepseek'
import type { GeneratedContent } from '@/lib/supabase/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  let tab: keyof GeneratedContent
  try {
    const body = await req.json() as { tab: keyof GeneratedContent }
    tab = body.tab
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const validTabs: Array<keyof GeneratedContent> = [
    'listing_it', 'listing_en', 'instagram', 'facebook', 'whatsapp', 'email',
  ]
  if (!validTabs.includes(tab)) {
    return NextResponse.json({ error: 'Tab non valido' }, { status: 400 })
  }

  // Fetch user's workspace for ownership enforcement — admin client bypasses RLS
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Belt-and-suspenders: filter by both id AND workspace_id alongside RLS
  const { data: rawListing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  const listing = rawListing as import('@/lib/supabase/types').Listing | null

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  if (!listing.generated_content) {
    return NextResponse.json({ error: 'Contenuto originale mancante' }, { status: 400 })
  }

  const propertyData = {
    property_type: listing.property_type as string,
    floor: listing.floor,
    total_floors: listing.total_floors,
    address: listing.address,
    city: listing.city,
    neighborhood: listing.neighborhood,
    price: listing.price,
    sqm: listing.sqm,
    rooms: listing.rooms,
    bathrooms: listing.bathrooms,
    features: listing.features as string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    condition: (listing as any).condition ?? null,
    notes: listing.notes,
    tone: listing.tone as 'standard' | 'luxury' | 'approachable' | 'investment',
  }

  let updatedContent: GeneratedContent
  try {
    updatedContent = await regenerateTab(
      propertyData,
      tab,
      listing.generated_content as GeneratedContent
    )
  } catch (err) {
    console.error('DeepSeek regeneration error:', err)
    return NextResponse.json({ error: 'Errore nella rigenerazione. Riprova.' }, { status: 500 })
  }

  // Update DB — cast to any to bypass Supabase typed client mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('listings')
    .update({ generated_content: updatedContent })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (updateError) {
    console.error('DB update error:', updateError)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ generated_content: updatedContent })
}
