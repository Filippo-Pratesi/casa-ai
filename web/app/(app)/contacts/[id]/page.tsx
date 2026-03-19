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
import { CONTACT_TYPE_COLORS as TYPE_COLORS, CONTACT_TYPE_LABELS as TYPE_LABELS } from '@/lib/contact-utils'

interface MatchingListing {
  id: string
  address: string
  city: string
  price: number
  sqm: number
  rooms: number
  property_type: string
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
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile?.workspace_id) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('contacts')
    .select('*, privacy_consent, privacy_consent_date, date_of_birth')
    .eq('id', id)
    .eq('workspace_id', profile?.workspace_id)
    .single()

  if (error || !data) notFound()

  const contact = data as Contact

  const isBuyerLike = contact.type === 'buyer' || contact.type === 'renter'

  // Build DB-level filter for matching listings (A5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildMatchingListingsQuery = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (admin as any)
      .from('listings')
      .select('id, address, city, price, sqm, rooms, property_type')
      .eq('workspace_id', profile?.workspace_id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (contact.budget_max !== null) q = q.lte('price', contact.budget_max)
    if (contact.min_rooms !== null) q = q.gte('rooms', contact.min_rooms)
    if (contact.min_sqm !== null) q = q.gte('sqm', contact.min_sqm)
    return q
  }

  // Fetch all independent data in parallel (A1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    isBuyerLike ? buildMatchingListingsQuery() : Promise.resolve({ data: [] }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('properties')
      .select('id, address, city, zone, stage, transaction_type')
      .eq('workspace_id', profile?.workspace_id)
      .eq('owner_contact_id', id)
      .order('updated_at', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('properties')
      .select('id, address, city, zone, stage, transaction_type')
      .eq('workspace_id', profile?.workspace_id)
      .eq('tenant_contact_id', id)
      .order('updated_at', { ascending: false })
      .limit(20),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('property_contacts')
      .select('role, properties!property_contacts_property_id_fkey(id, address, city, zone, stage, transaction_type)')
      .eq('workspace_id', profile?.workspace_id)
      .eq('contact_id', id)
      .limit(20),
    // Cronistoria contatto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_events')
      .select('id, event_type, title, body, event_date, created_at, related_property_id, related_listing_id, agent:users!contact_events_agent_id_fkey(name)')
      .eq('contact_id', id)
      .eq('workspace_id', profile?.workspace_id)
      .order('event_date', { ascending: false })
      .limit(100),
  ])

  const agentName: string | null = (agentData as { name: string } | null)?.name ?? null

  // Normalize cronistoria events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cronistoriaEvents = ((cronistoriaData ?? []) as any[]).map((e) => ({
    ...e,
    agent_name: e.agent?.name ?? null,
    agent: undefined,
  }))
  const appointments = (appointmentsData ?? []) as { id: string; title: string; starts_at: string; type: string }[]
  // Apply city/type filters client-side (DB array contains not straightforward with ilike)
  const rawMatchingListings = (matchingListingsResult.data ?? []) as Array<MatchingListing>
  const matchingListings = rawMatchingListings.filter(l => {
    if ((contact.preferred_cities ?? []).length > 0 && !(contact.preferred_cities ?? []).map(s => s.toLowerCase()).includes(l.city.toLowerCase())) return false
    if ((contact.preferred_types ?? []).length > 0 && !(contact.preferred_types ?? []).includes(l.property_type)) return false
    return true
  })

  function birthdayDaysLeft(dob: string | null): number | null {
    if (!dob) return null
    const today = new Date()
    const [, mm, dd] = dob.split('-').map(Number)
    let next = new Date(today.getFullYear(), mm - 1, dd)
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
    const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
    return diff <= 7 ? diff : null
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
  const otherProperties: LinkedProperty[] = ((contactLinks ?? []) as any[])
    .filter((cl) => cl.properties)
    .map((cl) => ({ ...cl.properties, role: cl.role }))
    // exclude properties already shown as owner/tenant
    .filter((p) =>
      !ownerProperties.some((op) => op.id === p.id) &&
      !tenantProperties.some((tp) => tp.id === p.id)
    )

  const hasLinkedProperties = ownerProperties.length > 0 || tenantProperties.length > 0 || otherProperties.length > 0

  const STAGE_LABELS: Record<string, string> = {
    sconosciuto: 'Sconosciuto', ignoto: 'Non contattato', conosciuto: 'Conosciuto',
    incarico: 'Incarico', venduto: 'Venduto', locato: 'Locato', disponibile: 'Disponibile',
  }
  const STAGE_COLORS: Record<string, string> = {
    sconosciuto: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    ignoto: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    conosciuto: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    incarico: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    venduto: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
    locato: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    disponibile: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  }
  const ROLE_LABELS: Record<string, string> = {
    proprietario: 'Proprietario', moglie_marito: 'Moglie/Marito', figlio_figlia: 'Figlio/Figlia',
    vicino: 'Vicino', portiere: 'Portiere', amministratore: 'Amministratore',
    avvocato: 'Avvocato', commercialista: 'Commercialista',
    precedente_proprietario: 'Ex proprietario', inquilino: 'Inquilino', altro: 'Altro',
  }

  const hasPreferences = isBuyerLike && (
    contact.budget_min || contact.budget_max ||
    (contact.preferred_cities ?? []).length > 0 ||
    (contact.preferred_types ?? []).length > 0 ||
    contact.min_sqm || contact.min_rooms
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Nav */}
      <div className="flex items-center justify-between animate-in-1">
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/contacts" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Clienti</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/contacts/${id}/edit`} className="rounded-xl bg-[oklch(0.57_0.20_33)] text-white px-4 py-2 text-sm font-semibold hover:bg-[oklch(0.52_0.20_33)] transition-colors inline-flex items-center gap-1.5">
            Modifica
          </Link>
          <DeleteContactButton contactId={id} name={contact.name} />
        </div>
      </div>

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
                <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${TYPE_COLORS[contact.type]}`}>
                  {TYPE_LABELS[contact.type]}
                </span>
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

      {/* Matching listings */}
      {matchingListings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Immobili compatibili</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{matchingListings.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matchingListings.slice(0, 5).map((l) => (
              <a
                key={l.id}
                href={`/listing/${l.id}`}
                className="rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-muted transition-colors block"
              >
                <p className="text-sm font-medium text-foreground truncate">{l.address}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{l.city}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">€{l.price.toLocaleString('it-IT')}</span>
                  <span>{l.sqm} m²</span>
                  <span>{l.rooms} loc.</span>
                </div>
              </a>
            ))}
          </div>
          {matchingListings.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">+ {matchingListings.length - 5} altri</p>
          )}
        </div>
      )}

      {/* Privacy consent */}
      <PrivacyConsentSection
        contactId={id}
        initialConsent={contact.privacy_consent ?? false}
        initialConsentDate={contact.privacy_consent_date ?? null}
      />

      {/* Attachments */}
      <AttachmentsSection
        entityId={id}
        apiBase={`/api/contacts/${id}/attachments`}
        downloadBase={`/api/contacts/${id}/attachments/download`}
        label="Documenti allegati"
      />

      {/* Immobili collegati dalla Banca Dati */}
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

      {/* Cronistoria contatto */}
      <ContactCronistoria
        contactId={id}
        initialEvents={cronistoriaEvents}
      />

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
  )
}
