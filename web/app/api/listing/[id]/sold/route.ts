import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
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

  const body = await req.json()
  const soldByAgentId: string | null = typeof body.sold_by_agent_id === 'string' ? body.sold_by_agent_id : null
  const buyerContactId: string | null = typeof body.buyer_contact_id === 'string' ? body.buyer_contact_id : null
  const buyerName: string | null = typeof body.buyer_name === 'string' && body.buyer_name.trim() ? body.buyer_name.trim() : null
  const removeContact: boolean = body.remove_contact === true

  // Fetch the listing
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

  // Archive as sold
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
      sold: true,
      sold_to_contact_id: buyerContactId,
      sold_to_name: buyerName,
      sold_by_agent_id: soldByAgentId,
      archived_by_user_id: user.id,
    })

  if (archiveError) {
    console.error('Archive sold listing error:', archiveError)
    return NextResponse.json({ error: "Errore nell'archiviazione" }, { status: 500 })
  }

  // Optionally archive + remove buyer contact
  if (removeContact && buyerContactId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactData } = await (admin as any)
      .from('contacts')
      .select('*')
      .eq('id', buyerContactId)
      .eq('workspace_id', profile.workspace_id)
      .single()

    if (contactData) {
      const contact = contactData as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('archived_contacts').insert({
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
        bought_listing: true,
        bought_listing_id: id,
        bought_listing_address: listing.address,
        archived_by_user_id: user.id,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('contacts')
        .delete()
        .eq('id', buyerContactId)
        .eq('workspace_id', profile.workspace_id)
    }
  }

  // Delete the listing from active table
  await admin
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  return NextResponse.json({ success: true })
}
