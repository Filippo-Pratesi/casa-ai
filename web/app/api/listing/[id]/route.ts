import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/listing/[id] — update listing price (records history)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Corpo non valido' }, { status: 400 }) }

  const newPrice = typeof body.price === 'number' ? Math.round(body.price) : null
  if (!newPrice || newPrice <= 0) return NextResponse.json({ error: 'Prezzo non valido' }, { status: 400 })

  // Fetch current price
  const { data: current } = await admin
    .from('listings')
    .select('price')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!current) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  const currentPrice = (current as { price: number }).price

  if (currentPrice !== newPrice) {
    // Record history
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('listing_price_history').insert({
      listing_id: id,
      old_price: currentPrice,
      new_price: newPrice,
    })
  }

  // Update listing
  const { error } = await admin
    .from('listings')
    .update({ price: newPrice })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
  if (error) return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 })

  return NextResponse.json({ success: true, price: newPrice })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Parse optional body
  let sold = false
  try {
    const body = await req.json()
    sold = body.sold === true
  } catch {
    // no body — plain delete
  }

  // Fetch listing before deleting (for archive snapshot)
  const { data: listingData, error: fetchError } = await admin
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (fetchError || !listingData) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const listing = listingData as Record<string, unknown>

  // Archive the listing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: archiveError } = await (admin as any)
    .from('archived_listings')
    .insert({
      original_id: listing.id,
      workspace_id: listing.workspace_id,
      agent_id: listing.agent_id,
      property_type: listing.property_type,
      floor: listing.floor,
      total_floors: listing.total_floors,
      address: listing.address,
      city: listing.city,
      neighborhood: listing.neighborhood,
      price: listing.price,
      sqm: listing.sqm,
      rooms: listing.rooms,
      bathrooms: listing.bathrooms,
      features: listing.features,
      notes: listing.notes,
      tone: listing.tone,
      photos_urls: listing.photos_urls,
      generated_content: listing.generated_content,
      condition: listing.condition ?? null,
      sold,
      archived_by_user_id: user.id,
    })

  if (archiveError) {
    console.error('Archive listing error:', archiveError)
    return NextResponse.json({ error: "Errore nell'archiviazione" }, { status: 500 })
  }

  // Delete the listing
  const { error } = await admin
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (error) {
    console.error('Delete listing error:', error)
    return NextResponse.json({ error: 'Errore nella cancellazione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
