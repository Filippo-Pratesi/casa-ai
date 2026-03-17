import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, Euro, Home, MapPin, Maximize2, Building2, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteContactButton } from '@/components/contacts/delete-contact-button'
import { PrivacyConsentSection } from '@/components/contacts/privacy-consent-section'
import { AttachmentsSection } from '@/components/shared/attachments-section'
import { BirthdayCard } from '@/components/contacts/birthday-card'

interface MatchingListing {
  id: string
  address: string
  city: string
  price: number
  sqm: number
  rooms: number
  property_type: string
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100',
  seller: 'bg-green-50 text-green-700 border-green-100',
  renter: 'bg-purple-50 text-purple-700 border-purple-100',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-neutral-50 text-neutral-700 border-neutral-200',
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

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user!.id)
    .single()

  const profile = profileData as { workspace_id: string } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('contacts')
    .select('*, privacy_consent, privacy_consent_date, date_of_birth')
    .eq('id', id)
    .eq('workspace_id', profile?.workspace_id)
    .single()

  if (error || !data) notFound()

  const contact = data as Contact

  // Fetch agent who added this contact
  let agentName: string | null = null
  if (contact.agent_id) {
    const { data: agentData } = await admin
      .from('users')
      .select('name')
      .eq('id', contact.agent_id)
      .single()
    agentName = (agentData as { name: string } | null)?.name ?? null
  }

  const isBuyerLike = contact.type === 'buyer' || contact.type === 'renter'

  // Find matching listings for buyer/renter contacts
  let matchingListings: MatchingListing[] = []
  if (isBuyerLike) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allListings } = await (admin as any)
      .from('listings')
      .select('id, address, city, price, sqm, rooms, property_type')
      .eq('workspace_id', profile?.workspace_id)
      .order('created_at', { ascending: false })
      .limit(100)

    matchingListings = ((allListings ?? []) as Array<MatchingListing>).filter(l => {
      if (contact.budget_max !== null && l.price > contact.budget_max) return false
      if ((contact.preferred_cities ?? []).length > 0 && !(contact.preferred_cities ?? []).map(s => s.toLowerCase()).includes(l.city.toLowerCase())) return false
      if ((contact.preferred_types ?? []).length > 0 && !(contact.preferred_types ?? []).includes(l.property_type)) return false
      if (contact.min_rooms !== null && l.rooms < contact.min_rooms) return false
      if (contact.min_sqm !== null && l.sqm < contact.min_sqm) return false
      return true
    }).slice(0, 6)
  }

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

  const hasPreferences = isBuyerLike && (
    contact.budget_min || contact.budget_max ||
    (contact.preferred_cities ?? []).length > 0 ||
    (contact.preferred_types ?? []).length > 0 ||
    contact.min_sqm || contact.min_rooms
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/contacts" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-neutral-500">Clienti</span>
        </div>
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href={`/contacts/${id}/edit`} />} variant="outline" size="sm" className="h-8 text-xs">
            Modifica
          </Button>
          <DeleteContactButton contactId={id} name={contact.name} />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{contact.name}</h1>
          <p className="mt-1 text-neutral-500 text-sm">
            Aggiunto il {new Date(contact.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            {agentName ? ` · da ${agentName}` : ''}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${TYPE_COLORS[contact.type]}`}>
          {TYPE_LABELS[contact.type]}
        </span>
      </div>

      {/* Contact info */}
      <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4 space-y-2.5">
        {contact.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
            <a href={`tel:${contact.phone}`} className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors">
              {contact.phone}
            </a>
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-neutral-400 shrink-0" />
            <a href={`mailto:${contact.email}`} className="text-sm text-neutral-700 hover:text-neutral-900 transition-colors">
              {contact.email}
            </a>
          </div>
        )}
        {(contact.city_of_residence || contact.address_of_residence) && (
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-neutral-400 shrink-0" />
            <span className="text-sm text-neutral-700">
              {[contact.address_of_residence, contact.city_of_residence].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {!contact.phone && !contact.email && !contact.city_of_residence && (
          <p className="text-sm text-neutral-400">Nessun recapito inserito</p>
        )}
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Note</p>
          <p className="text-sm text-neutral-700">{contact.notes}</p>
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
          <h2 className="text-base font-semibold text-neutral-900">Preferenze ricerca</h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(contact.budget_min || contact.budget_max) && (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <Euro className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-neutral-900">
                  {contact.budget_min ? `€${contact.budget_min.toLocaleString('it-IT')}` : '—'}
                  {' — '}
                  {contact.budget_max ? `€${contact.budget_max.toLocaleString('it-IT')}` : '∞'}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">Budget</p>
              </div>
            )}
            {contact.min_rooms && (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <Home className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
                <p className="text-xl font-semibold text-neutral-900">{contact.min_rooms}+</p>
                <p className="text-xs text-neutral-500 mt-0.5">Locali minimi</p>
              </div>
            )}
            {contact.min_sqm && (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
                <Maximize2 className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
                <p className="text-xl font-semibold text-neutral-900">{contact.min_sqm}+</p>
                <p className="text-xs text-neutral-500 mt-0.5">m² minimi</p>
              </div>
            )}
          </div>

          {(contact.preferred_cities ?? []).length > 0 && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
            <Home className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-700">Immobili compatibili</h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{matchingListings.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matchingListings.map((l) => (
              <a
                key={l.id}
                href={`/listing/${l.id}`}
                className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors block"
              >
                <p className="text-sm font-medium text-neutral-900 truncate">{l.address}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{l.city}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-800">€{l.price.toLocaleString('it-IT')}</span>
                  <span>{l.sqm} m²</span>
                  <span>{l.rooms} loc.</span>
                </div>
              </a>
            ))}
          </div>
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
    </div>
  )
}
