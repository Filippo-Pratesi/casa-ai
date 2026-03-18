import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string }> }

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// POST /api/properties/[id]/promote-to-listing — create a listing pre-filled from property
export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Fetch property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error: fetchError } = await (supabase as any)
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (fetchError || !property) {
    return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  }

  const p = property as Record<string, unknown>

  if (p.listing_id) {
    return NextResponse.json({ error: "L'immobile ha già un annuncio associato" }, { status: 409 })
  }

  // Map property fields to listing fields
  const listingPayload = {
    workspace_id: workspaceId,
    agent_id: user.id,
    title: `${p.address}, ${p.city}`,
    address: p.address,
    city: p.city,
    property_type: p.property_type ?? 'apartment',
    sqm: p.sqm ?? null,
    rooms: p.rooms ?? null,
    bathrooms: p.bathrooms ?? null,
    floor: p.floor ?? null,
    price: p.estimated_value ?? null,
    status: 'draft',
    transaction_type: p.transaction_type ?? 'vendita',
    property_id: id,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing, error: listingError } = await (supabase as any)
    .from('listings')
    .insert(listingPayload)
    .select('id')
    .single()

  if (listingError || !listing) {
    return NextResponse.json({ error: "Errore nella creazione dell'annuncio" }, { status: 500 })
  }

  const listingId = (listing as { id: string }).id

  // Update property with listing_id reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('properties')
    .update({ listing_id: listingId })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  // Create annuncio_creato event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('property_events')
    .insert({
      workspace_id: workspaceId,
      property_id: id,
      agent_id: user.id,
      event_type: 'annuncio_creato',
      title: 'Annuncio creato',
      description: `Annuncio #${listingId} creato dall\'immobile`,
      metadata: { listing_id: listingId },
    })

  return NextResponse.json({ listing_id: listingId })
}
