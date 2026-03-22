import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Building2 } from 'lucide-react'
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
    .single()

  if (!propertyData) notFound()

  // If property belongs to another workspace, show access-restricted page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propertyOwnerWorkspaceId: string = (propertyData as any).workspace_id
  if (propertyOwnerWorkspaceId !== profile.workspace_id) {
    // Fetch owner workspace name to show to user
    const { data: ownerWs } = await admin
      .from('workspaces')
      .select('name')
      .eq('id', propertyOwnerWorkspaceId)
      .single()
    const ownerWsName = (ownerWs as { name: string } | null)?.name ?? 'un\'altra agenzia del network'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prop = propertyData as any

    return (
      <div className="max-w-2xl mx-auto pb-12 pt-6 px-4">
        <div className="flex items-center gap-2 mb-8">
          <Link href="/banca-dati" className="rounded-lg p-1.5 hover:bg-muted transition-colors inline-flex">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm text-muted-foreground">Banca Dati</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>

          <div>
            <h1 className="text-lg font-semibold">{prop.address ?? 'Immobile'}{prop.city ? `, ${prop.city}` : ''}</h1>
            <p className="text-sm text-muted-foreground mt-1">Accesso limitato</p>
          </div>

          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Questo immobile appartiene a <strong>{ownerWsName}</strong>, un&apos;altra agenzia del tuo gruppo.
            Non ti è consentito accedere alla scheda completa dell&apos;immobile.
          </p>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-start gap-3 text-left max-w-md mx-auto">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{ownerWsName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Per informazioni su questo immobile, contatta direttamente l&apos;agenzia tramite la rete del tuo gruppo.
              </p>
            </div>
          </div>

          <Link
            href="/banca-dati"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna alla Banca Dati
          </Link>
        </div>
      </div>
    )
  }

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
  const { data: rawContactsData } = await (admin as any)
    .from('property_contacts')
    .select('id, role, is_primary, notes, contact:contacts(id, name, phone, email, type, types)')
    .eq('property_id', id)
    .order('is_primary', { ascending: false })

  // Deduplicate: keep only one row per (contact_id, role) to prevent display duplicates
  const seenContactRoles = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactsData = (rawContactsData as any[] ?? []).filter((row: any) => {
    const key = `${row.contact?.id ?? row.id}::${row.role}`
    if (seenContactRoles.has(key)) return false
    seenContactRoles.add(key)
    return true
  })

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
