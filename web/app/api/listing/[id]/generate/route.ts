import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateListingContent } from '@/lib/deepseek'
import type { Listing } from '@/lib/supabase/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // Use admin client to bypass RLS for profile lookup
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawListing, error: listingError } = await (admin as any)
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (listingError || !rawListing) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const listing = rawListing as Listing

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
    features: (listing.features ?? []) as string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    condition: (listing as any).condition ?? null,
    notes: listing.notes,
    tone: listing.tone as 'standard' | 'luxury' | 'approachable' | 'investment',
  }

  let generatedContent
  try {
    generatedContent = await generateListingContent(propertyData)
  } catch (err) {
    console.error('DeepSeek generate error:', err)
    return NextResponse.json({ error: 'Errore nella generazione AI. Riprova.' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('listings')
    .update({ generated_content: generatedContent })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (updateError) {
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ generated_content: generatedContent })
}
