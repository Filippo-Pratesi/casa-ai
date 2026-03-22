import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Euro, Home, MapPin, Maximize2, Building2, Layers, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteContactButton } from '@/components/contacts/delete-contact-button'
import { PrivacyConsentSection } from '@/components/contacts/privacy-consent-section'
import { AttachmentsSection } from '@/components/shared/attachments-section'
import { BirthdayCard } from '@/components/contacts/birthday-card'
import { ContactCronistoria } from '@/components/contacts/contact-cronistoria'
import { CONTACT_TYPE_COLORS as TYPE_COLORS, CONTACT_TYPE_LABELS as TYPE_LABELS, birthdayDaysLeft } from '@/lib/contact-utils'
import { ContactTypeBadges } from '@/components/contacts/contact-type-badges'
import { PROPERTY_ROLE_LABELS } from '@/lib/property-role-labels'
import { ProponiImmobileButton } from '@/components/contacts/proponi-immobile-button'
import { ProposeEditButton } from '@/components/contacts/propose-edit-button'

interface MatchResult {
  property_id: string
  combined_score: number
  ai_adjustment: number
  ai_reason: string | null
  properties: { address: string; city: string; estimated_value: number | null; sqm: number | null; rooms: number | null; property_type: string | null } | null
  listing_id?: string | null
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  types: string[] | null
  notes: string | null
  city_of_residence: string | null
  address_of_residence: string | null
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[] | null
  preferred_types: string[] | null
  min_sqm: number | null
  min_rooms: number | null
  desired_features: string[] | null
  created_at: string
  agent_id: string | null
  privacy_consent: boolean
  privacy_consent_date: string | null
  date_of_birth: string | null
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role, group_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string; group_id: string | null } | null
  if (!profile?.workspace_id) notFound()

  // Fetch contact by ID without workspace filter — we validate access below
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('contacts')
    .select('*, privacy_consent, privacy_consent_date, date_of_birth')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  // Validate access: own workspace OR contact sharing active between the two workspaces
  const contactWorkspaceId: string = data.workspace_id
  const isOwnWorkspace = contactWorkspaceId === profile.workspace_id
  if (!isOwnWorkspace) {
    // Check group_contact_sharing — workspace pair stored with a_id < b_id
    const [wsA, wsB] = [profile.workspace_id, contactWorkspaceId].sort()
    const { data: sharingRow } = await admin
      .from('group_contact_sharing')
      .select('id')
      .eq('workspace_a_id', wsA)
      .eq('workspace_b_id', wsB)
      .eq('enabled', true)
      .single()
    if (!sharingRow) notFound()
  }

  const contact = data as Contact

  const isBuyerLike = contact.type === 'buyer' || contact.type === 'renter' ||
    (contact.types ?? []).some(t => t === 'buyer' || t === 'renter')

  // Query pre-computed match results from match engine (deterministic + AI)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildMatchResultsQuery = () => (admin as any)
    .from('match_results')
    .select('property_id, combined_score, ai_adjustment, ai_reason, properties(address, city, estimated_value, sqm, rooms, property_type)')
    .eq('workspace_id', contactWorkspaceId)
    .eq('contact_id', id)
    .order('combined_score', { ascending: false })
    .limit(5)

  // Build property queries — for cross-agency contacts, only show incarico stage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ownerPropsQuery = (admin as any)
    .from('properties')
    .select('id, address, city, zone, stage, transaction_type')
    .eq('workspace_id', contactWorkspaceId)
    .eq('owner_contact_id', id)
    .order('updated_at', { ascending: false })
    .limit(20)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenantPropsQuery = (admin as any)
    .from('properties')
    .select('id, address, city, zone, stage, transaction_type')
    .eq('workspace_id', contactWorkspaceId)
    .eq('tenant_contact_id', id)
    .order('updated_at', { ascending: false })
    .limit(20)
  if (!isOwnWorkspace) {
    ownerPropsQuery = ownerPropsQuery.eq('stage', 'incarico')
    tenantPropsQuery = tenantPropsQuery.eq('stage', 'incarico')
  }

  // Fetch all independent data in parallel (A1)
  const [
    { data: agentData },
    { data: appointmentsData },
    matchingListingsResult,
    { data: ownerProps },
    { data: tenantProps },
    { data: contactLinks },
    { data: cronistoriaData },
  ] = await Promise.all([
    contact.agent_id
      ? admin.from('users').select('name').eq('id', contact.agent_id).single()
      : Promise.resolve({ data: null }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('appointments')
      .select('id, title, starts_at, type')
      .eq('contact_id', id)
      .order('starts_at', { ascending: false })
      .limit(10),
    isBuyerLike ? buildMatchResultsQuery() : Promise.resolve({ data: [] }),
    ownerPropsQuery,
    tenantPropsQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('property_contacts')
      .select('role, properties!property_contacts_property_id_fkey(id, address, city, zone, stage, transaction_type)')
      .eq('workspace_id', contactWorkspaceId)
      .eq('contact_id', id)
      .limit(20),
    // Cronistoria contatto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_events')
      .select('id, event_type, title, body, event_date, created_at, related_property_id, related_listing_id, agent:users!contact_events_agent_id_fkey(name)')
      .eq('contact_id', id)
      .eq('workspace_id', contactWorkspaceId)
      .order('event_date', { ascending: false })
      .limit(100),
  ])

  const agentName: string | null = (agentData as { name: string } | null)?.name ?? null

  // Normalize cronistoria events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cronistoriaEvents = ((cronistoriaData ?? []) as any[]).map((e) => ({
    ...e,
    agent_name: e.agent?.name ?? null,
    agent: undefined,
  }))

  // For cross-agency contacts: filter out events linked to properties not in 'incarico'
  if (!isOwnWorkspace) {
    const propertyIdsInEvents = [...new Set(
      cronistoriaEvents
        .filter((e) => e.related_property_id)
        .map((e) => e.related_property_id as string)
    )]
    const incaricoPropertyIds = new Set<string>()
    if (propertyIdsInEvents.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: propStages } = await (admin as any)
        .from('properties')
        .select('id, stage')
        .in('id', propertyIdsInEvents)
      for (const p of (propStages ?? []) as { id: string; stage: string }[]) {
        if (p.stage === 'incarico') incaricoPropertyIds.add(p.id)
      }
    }
    cronistoriaEvents = cronistoriaEvents.filter((e) =>
      !e.related_property_id || incaricoPropertyIds.has(e.related_property_id)
    )
  }
  const appointments = (appointmentsData ?? []) as { id: string; title: string; starts_at: string; type: string }[]
  const rawMatchResults = (matchingListingsResult.data ?? []) as MatchResult[]

  // Lookup listing IDs for matched properties (separate query — no direct FK from match_results to listings)
  let matchResults = rawMatchResults
  if (rawMatchResults.length > 0) {
    const propertyIds = rawMatchResults.map(m => m.property_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listingsForProps } = await (admin as any)
      .from('listings')
      .select('id, property_id')
      .in('property_id', propertyIds)
    const listingMap: Record<string, string> = {}
    for (const l of (listingsForProps ?? []) as { id: string; property_id: string }[]) {
      listingMap[l.property_id] = l.id
    }
    matchResults = rawMatchResults.map(m => ({ ...m, listing_id: listingMap[m.property_id] ?? null }))
  }

  const birthdayDays = birthdayDaysLeft(contact.date_of_birth)

  // Linked properties from banca dati
  interface LinkedProperty {
    id: string; address: string; city: string; zone: string | null; stage: string
    transaction_type: string | null; role?: string
  }

  const ownerProperties: LinkedProperty[] = (ownerProps ?? []) as LinkedProperty[]
  const tenantProperties: LinkedProperty[] = (tenantProps ?? []) as LinkedProperty[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let otherProperties: LinkedProperty[] = ((contactLinks ?? []) as any[])
    .filter((cl) => cl.properties)
    .map((cl) => ({ ...cl.properties, role: cl.role }))
    // exclude properties already shown as owner/tenant
    .filter((p) =>
      !ownerProperties.some((op) => op.id === p.id) &&
      !tenantProperties.some((tp) => tp.id === p.id)
    )

  // For cross-agency contacts: only show incarico properties
  if (!isOwnWorkspace) {
    otherProperties = otherProperties.filter((p) => p.stage === 'incarico')
  }

  const hasLinkedProperties = ownerProperties.length > 0 || tenantProperties.length > 0 || otherProperties.length > 0

  const STAGE_LABELS: Record<string, string> = {
    sconosciuto: 'Sconosciuto', ignoto: 'Non contattato', conosciuto: 'Conosciuto',
    incarico: 'Incarico', venduto: 'Venduto', locato: 'Locato',
  }
  // Colors aligned with STAGE_CONFIG in components/banca-dati/property-stage-icon.tsx
  const STAGE_COLORS: Record<string, string> = {
    sconosciuto: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    ignoto: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    conosciuto: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    incarico: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    venduto: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    locato: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  }
  const ROLE_LABELS = PROPERTY_ROLE_LABELS

  const hasPreferences = isBuyerLike && (
    contact.budget_min || contact.budget_max ||
    (contact.preferred_cities ?? []).length > 0 ||
    (contact.preferred_types ?? []).length > 0 ||
    contact.min_sqm || contact.min_rooms
  )

  return (
    <div className="max-w-6xl mx-auto pb-12">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between animate-in-1">
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/contacts" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Clienti</span>
        </div>
        <div className="flex items-center gap-2">
          {isOwnWorkspace && isBuyerLike && (
            <ProponiImmobileButton
              contactId={id}
              contactName={contact.name}
              contactEmail={contact.email}
              contactPhone={contact.phone}
            />
          )}
          {isOwnWorkspace ? (
            <>
              <Link href={`/contacts/${id}/edit`} className="rounded-xl border border-border bg-background text-foreground px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors inline-flex items-center gap-1.5">
                Modifica
              </Link>
              <DeleteContactButton contactId={id} name={contact.name} />
            </>
          ) : (
            <ProposeEditButton contactId={id} contactName={contact.name} />
          )}
        </div>
      </div>

      {/* Cross-agency read-only banner */}
      {!isOwnWorkspace && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          <Building2 className="h-4 w-4 shrink-0" />
          <span>Questo contatto appartiene a un&apos;altra agenzia del network — visualizzazione in sola lettura.</span>
        </div>
      )}

      {/* Hero card */}
      <div className="animate-in-2 rounded-2xl border border-border bg-card overflow-hidden">
        {/* Gradient header by contact type */}
        <div className={`px-6 pt-6 pb-5 ${
          contact.type === 'buyer' ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/20' :
          contact.type === 'seller' ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/20' :
          contact.type === 'renter' ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/20' :
          contact.type === 'landlord' ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/20' :
          'bg-gradient-to-br from-muted/60 to-muted/30'
        }`}>
          <div className="flex items-start gap-4">
            {/* 64px avatar */}
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold shadow-md ${
              contact.type === 'buyer' ? 'bg-blue-500 text-white' :
              contact.type === 'seller' ? 'bg-green-500 text-white' :
              contact.type === 'renter' ? 'bg-amber-500 text-white' :
              contact.type === 'landlord' ? 'bg-purple-500 text-white' :
              'bg-[oklch(0.57_0.20_33)] text-white'
            }`}>
              {contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">{contact.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <ContactTypeBadges types={contact.types} type={contact.type} size="sm" />
                <span className="text-xs text-muted-foreground">
                  Aggiunto il {new Date(contact.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {agentName ? ` · da ${agentName}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info with inline action buttons */}
        <div className="border-t border-border px-5 py-4 space-y-2.5">
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${contact.phone}`} className="text-sm text-foreground flex-1">
                {contact.phone}
              </a>
              <a
                href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Apri WhatsApp per ${contact.name}`}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-green-600 hover:bg-green-50 border border-green-200 transition-colors"
              >
                <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </a>
              <a href={`tel:${contact.phone}`} aria-label={`Chiama ${contact.name}`} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted border border-border transition-colors">
                <Phone className="h-3 w-3" />
                Chiama
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${contact.email}`} className="text-sm text-foreground flex-1 truncate">
                {contact.email}
              </a>
              <a
                href={`mailto:${contact.email}`}
                aria-label={`Invia email a ${contact.name}`}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.57_0.20_33/0.08)] border border-[oklch(0.57_0.20_33/0.25)] transition-colors"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            </div>
          )}
          {(contact.city_of_residence || contact.address_of_residence) && (
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">
                {[contact.address_of_residence, contact.city_of_residence].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {!contact.phone && !contact.email && !contact.city_of_residence && (
            <p className="text-sm text-muted-foreground">Nessun recapito inserito</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Note</p>
          <p className="text-sm text-foreground">{contact.notes}</p>
        </div>
      )}

      {/* Birthday */}
      {birthdayDays !== null && (
        <BirthdayCard
          contactId={id}
          contactName={contact.name}
          daysLeft={birthdayDays}
        />
      )}

      {/* Buyer preferences */}
      {hasPreferences && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Preferenze ricerca</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(contact.budget_min || contact.budget_max) && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <Euro className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-foreground">
                  {contact.budget_min ? `€${contact.budget_min.toLocaleString('it-IT')}` : '—'}
                  {' — '}
                  {contact.budget_max ? `€${contact.budget_max.toLocaleString('it-IT')}` : '∞'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Budget</p>
              </div>
            )}
            {contact.min_rooms && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <Home className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-semibold text-foreground">{contact.min_rooms}+</p>
                <p className="text-xs text-muted-foreground mt-0.5">Locali minimi</p>
              </div>
            )}
            {contact.min_sqm && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                <Maximize2 className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-xl font-semibold text-foreground">{contact.min_sqm}+</p>
                <p className="text-xs text-muted-foreground mt-0.5">m² minimi</p>
              </div>
            )}
          </div>

          {(contact.preferred_cities ?? []).length > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Zone preferite
              </p>
              <div className="flex flex-wrap gap-2">
                {(contact.preferred_cities ?? []).map((city) => (
                  <Badge key={city} variant="secondary" className="rounded-full text-xs">{city}</Badge>
                ))}
              </div>
            </div>
          )}

          {(contact.preferred_types ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(contact.preferred_types ?? []).map((t) => (
                <Badge key={t} variant="outline" className="rounded-full text-xs">
                  {PROPERTY_TYPE_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Immobili compatibili — da Match Engine (solo per contatti della propria agenzia) */}
      {isOwnWorkspace && matchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Immobili compatibili</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{matchResults.length}</span>
          </div>
          <div className="space-y-2">
            {matchResults.map((m) => {
              const prop = m.properties
              const href = m.listing_id ? `/listing/${m.listing_id}` : `/banca-dati/${m.property_id}`
              const scoreColor = m.combined_score >= 80 ? 'text-green-600' : m.combined_score >= 60 ? 'text-amber-500' : 'text-blue-500'
              return (
                <Link
                  key={m.property_id}
                  href={href}
                  className="rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-muted transition-colors block"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{prop?.address ?? '—'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{prop?.city}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {prop?.estimated_value && <span className="font-semibold text-foreground">€{prop.estimated_value.toLocaleString('it-IT')}</span>}
                        {prop?.sqm && <span>{prop.sqm} m²</span>}
                        {prop?.rooms && <span>{prop.rooms} loc.</span>}
                        {prop?.property_type && <span>{PROPERTY_TYPE_LABELS[prop.property_type] ?? prop.property_type}</span>}
                      </div>
                      {m.ai_reason && <p className="text-xs text-muted-foreground italic mt-1">{m.ai_reason}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{m.combined_score}</span>
                      {m.ai_adjustment !== 0 && (
                        <span className="text-[10px] text-muted-foreground">AI {m.ai_adjustment > 0 ? '+' : ''}{m.ai_adjustment}</span>
                      )}
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Privacy consent — solo per contatti della propria agenzia */}
      {isOwnWorkspace && (
        <PrivacyConsentSection
          contactId={id}
          initialConsent={contact.privacy_consent ?? false}
          initialConsentDate={contact.privacy_consent_date ?? null}
        />
      )}

      {/* Attachments — read-only per contatti cross-agenzia */}
      <AttachmentsSection
        entityId={id}
        apiBase={`/api/contacts/${id}/attachments`}
        downloadBase={`/api/contacts/${id}/attachments/download`}
        label="Documenti allegati"
        readOnly={!isOwnWorkspace}
      />

      {/* Immobili collegati dalla Banca Dati — cross-agenzia mostra solo incarico */}
      {hasLinkedProperties && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Immobili collegati
          </p>
          {ownerProperties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/70">Come proprietario</p>
              {ownerProperties.map((p) => (
                <Link key={p.id} href={`/banca-dati/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.address}, {p.city}</p>
                    <p className="text-xs text-muted-foreground">{p.zone ? p.zone + ' · ' : ''}{p.transaction_type === 'affitto' ? 'Affitto' : 'Vendita'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[p.stage] ?? ''}`}>{STAGE_LABELS[p.stage] ?? p.stage}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {tenantProperties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/70">Come inquilino</p>
              {tenantProperties.map((p) => (
                <Link key={p.id} href={`/banca-dati/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.address}, {p.city}</p>
                    <p className="text-xs text-muted-foreground">{p.zone ? p.zone + ' · ' : ''}Locazione</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[p.stage] ?? ''}`}>{STAGE_LABELS[p.stage] ?? p.stage}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {otherProperties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/70">Altro ruolo</p>
              {otherProperties.map((p) => (
                <Link key={p.id} href={`/banca-dati/${p.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.address}, {p.city}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[p.role ?? ''] ?? p.role}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[p.stage] ?? ''}`}>{STAGE_LABELS[p.stage] ?? p.stage}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cronistoria — mobile only */}
      <div className="lg:hidden">
        <ContactCronistoria
          contactId={id}
          initialEvents={cronistoriaEvents}
        />
      </div>

      {/* Activity timeline — B2: semantic list markup */}
      {appointments && appointments.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">Appuntamenti</p>
          <ul role="list" aria-label="Cronologia appuntamenti" className="border-l-2 border-border pl-4 space-y-4 relative">
            {appointments.map((appt: { id: string; title: string; starts_at: string; type: string }) => (
              <li key={appt.id} className="relative">
                <div className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-blue-500" />
                <p className="text-sm font-medium">{appt.title}</p>
                <time dateTime={appt.starts_at} className="text-xs text-muted-foreground">{new Date(appt.starts_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>

    {/* Right sidebar: cronistoria */}
    <div className="hidden lg:block lg:sticky lg:top-4">
      <ContactCronistoria
        contactId={id}
        initialEvents={cronistoriaEvents}
      />
    </div>

    </div>
    </div>
  )
}
