import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ImmobileDetailClient } from '@/components/banca-dati/immobile-detail-client'

export const metadata = { title: 'Dettaglio Immobile — Banca Dati' }

export default async function ImmobileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role, name')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string; name: string } | null
  if (!profile) redirect('/auth/setup')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propertyData } = await (admin as any)
    .from('properties')
    .select(`
      *,
      owner_contact:contacts!properties_owner_contact_id_fkey(id, name, phone, email, type, types),
      tenant_contact:contacts!properties_tenant_contact_id_fkey(id, name, phone, email),
      agent:users!properties_agent_id_fkey(id, name),
      listing:listings!properties_listing_id_fkey(id, address, status)
    `)
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!propertyData) notFound()

  // Resolve OMI zone code from zone name for valuation engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propertyZoneName = (propertyData as any).zone as string | null
  let omiZoneCode: string | null = null
  if (propertyZoneName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: zoneData } = await (admin as any)
      .from('zones')
      .select('omi_zone_code')
      .eq('workspace_id', profile.workspace_id)
      .ilike('name', propertyZoneName)
      .maybeSingle()
    omiZoneCode = (zoneData as { omi_zone_code: string | null } | null)?.omi_zone_code ?? null
  }

  // Load property contacts with roles (include types for multi-type badges)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData } = await (admin as any)
    .from('property_contacts')
    .select('id, role, is_primary, notes, contact:contacts(id, name, phone, email, type, types)')
    .eq('property_id', id)
    .order('is_primary', { ascending: false })

  // Load last 20 events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventsData } = await (admin as any)
    .from('property_events')
    .select('id, event_type, title, description, sentiment, contact_id, agent_id, event_date, created_at, metadata, agent:users!property_events_agent_id_fkey(name)')
    .eq('property_id', id)
    .order('event_date', { ascending: false })
    .limit(20)

  // Load nearby
  const property = propertyData as {
    latitude: number | null;
    longitude: number | null;
    [key: string]: unknown;
  }

  // Fetch listing notes for linked listing (to show in property cronistoria)
  const linkedListingId = (propertyData as { listing_id?: string | null }).listing_id
  let listingNotes: Array<{ id: string; content: string; sentiment: string | null; created_at: string; agent_name: string | null }> = []
  if (linkedListingId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notesData } = await (admin as any)
      .from('listing_notes')
      .select('id, content, sentiment, created_at, agent:users!listing_notes_agent_id_fkey(name)')
      .eq('listing_id', linkedListingId)
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
      .limit(50)
    listingNotes = ((notesData ?? []) as Array<{ id: string; content: string; sentiment: string | null; created_at: string; agent: { name: string } | null }>)
      .map(n => ({ id: n.id, content: n.content, sentiment: n.sentiment ?? null, created_at: n.created_at, agent_name: n.agent?.name ?? null }))
  }

  let nearby = { same_building: [], nearby: [] }
  if (property.latitude && property.longitude) {
    try {
      const nearbyRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/properties/nearby?lat=${property.latitude}&lng=${property.longitude}&radius=100&exclude_id=${id}`,
        { cache: 'no-store' }
      )
      if (nearbyRes.ok) nearby = await nearbyRes.json()
    } catch { /* ignore */ }
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  const isOwner = (property as unknown as { agent_id: string }).agent_id === user.id

  return (
    <ImmobileDetailClient
      property={propertyData}
      propertyContacts={contactsData ?? []}
      events={(eventsData ?? []).map((e: { agent: { name: string } | null; [key: string]: unknown }) => ({
        ...e,
        agent_name: (e.agent as { name: string } | null)?.name ?? null,
        agent: undefined,
      }))}
      nearby={nearby}
      isAdmin={isAdmin}
      isOwner={isOwner}
      omiZoneCode={omiZoneCode}
      initialListingNotes={listingNotes}
    />
  )
}
