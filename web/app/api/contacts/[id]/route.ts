import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('workspace_id').eq('id', userId).single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// GET /api/contacts/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })

  return NextResponse.json({ contact: data })
}

// PATCH /api/contacts/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const validTypes = ['buyer', 'seller', 'renter', 'landlord', 'other']
  const allowed: Record<string, unknown> = {}

  if (typeof body.name === 'string' && body.name.trim()) allowed.name = body.name.trim()
  // Support multi-type update
  if (Array.isArray(body.types)) {
    const types = (body.types as unknown[]).filter((t): t is string => typeof t === 'string' && validTypes.includes(t))
    if (types.length > 0) {
      allowed.type = types[0]
      allowed.roles = types
    }
  } else if (typeof body.type === 'string' && validTypes.includes(body.type)) {
    allowed.type = body.type
    allowed.roles = [body.type]
  }
  if ('email' in body) allowed.email = typeof body.email === 'string' ? body.email.trim() || null : null
  if ('phone' in body) allowed.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  if ('city_of_residence' in body) allowed.city_of_residence = typeof body.city_of_residence === 'string' ? body.city_of_residence.trim() || null : null
  if ('address_of_residence' in body) allowed.address_of_residence = typeof body.address_of_residence === 'string' ? body.address_of_residence.trim() || null : null
  if ('notes' in body) allowed.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  if ('budget_min' in body) allowed.budget_min = typeof body.budget_min === 'number' ? body.budget_min : null
  if ('budget_max' in body) allowed.budget_max = typeof body.budget_max === 'number' ? body.budget_max : null
  if ('preferred_cities' in body) allowed.preferred_cities = Array.isArray(body.preferred_cities) ? body.preferred_cities : []
  if ('preferred_types' in body) allowed.preferred_types = Array.isArray(body.preferred_types) ? body.preferred_types : []
  if ('min_sqm' in body) allowed.min_sqm = typeof body.min_sqm === 'number' ? body.min_sqm : null
  if ('min_rooms' in body) allowed.min_rooms = typeof body.min_rooms === 'number' ? body.min_rooms : null
  if ('desired_features' in body) allowed.desired_features = Array.isArray(body.desired_features) ? body.desired_features : []
  if ('codice_fiscale' in body) allowed.codice_fiscale = typeof body.codice_fiscale === 'string' ? body.codice_fiscale.trim() || null : null
  if ('partita_iva' in body) allowed.partita_iva = typeof body.partita_iva === 'string' ? body.partita_iva.trim() || null : null
  if ('professione' in body) allowed.professione = typeof body.professione === 'string' ? body.professione.trim() || null : null
  if ('data_nascita' in body) allowed.data_nascita = typeof body.data_nascita === 'string' ? body.data_nascita || null : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update(allowed)
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/contacts/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Parse optional body (bought flow)
  let bought = false
  let listingId: string | null = null
  let listingAddress: string | null = null
  let archiveListing = false

  try {
    const body = await req.json()
    bought = body.bought === true
    listingId = typeof body.listing_id === 'string' ? body.listing_id : null
    listingAddress = typeof body.listing_address === 'string' ? body.listing_address : null
    archiveListing = body.archive_listing === true
  } catch {
    // no body - plain delete
  }

  // Fetch contact before deleting (for archive snapshot)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactData, error: fetchError } = await (supabase as any)
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (fetchError || !contactData) {
    return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })
  }

  const contact = contactData as Record<string, unknown>

  // Archive the contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: archiveError } = await (supabase as any)
    .from('archived_contacts')
    .insert({
      original_id: contact.id,
      workspace_id: contact.workspace_id,
      agent_id: contact.agent_id,
      name: contact.name,
      type: contact.type,
      email: contact.email,
      phone: contact.phone,
      city_of_residence: contact.city_of_residence,
      address_of_residence: contact.address_of_residence,
      notes: contact.notes,
      budget_min: contact.budget_min,
      budget_max: contact.budget_max,
      preferred_cities: contact.preferred_cities,
      preferred_types: contact.preferred_types,
      min_sqm: contact.min_sqm,
      min_rooms: contact.min_rooms,
      desired_features: contact.desired_features,
      bought_listing: bought,
      bought_listing_id: listingId,
      bought_listing_address: listingAddress,
      archived_by_user_id: user.id,
    })

  if (archiveError) {
    console.error('Archive contact error:', archiveError)
    return NextResponse.json({ error: 'Errore archiviazione' }, { status: 500 })
  }

  // Optionally archive + remove the bought listing
  if (bought && archiveListing && listingId) {
    const { data: listingData } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .eq('workspace_id', workspaceId)
      .single()

    if (listingData) {
      const listing = listingData as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('archived_listings').insert({
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
        sold: true,
        sold_to_contact_id: id,
        sold_to_name: contact.name,
        archived_by_user_id: user.id,
      })
      await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('workspace_id', workspaceId)
    }
  }

  // Delete the contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: 'Errore nella cancellazione' }, { status: 500 })

  return NextResponse.json({ success: true })
}
