import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Archive, Home, UserRound, CheckCircle2, Trash2, ChevronRight } from 'lucide-react'

interface ArchivedListing {
  id: string
  original_id: string
  address: string
  city: string
  neighborhood: string | null
  price: number
  property_type: string
  sqm: number
  rooms: number
  bathrooms: number
  floor: number | null
  total_floors: number | null
  sold: boolean
  sold_to_name: string | null
  sold_by_agent_id: string | null
  agent_id: string
  archived_at: string
}

interface ArchivedContact {
  id: string
  name: string
  type: string
  phone: string | null
  email: string | null
  bought_listing: boolean
  bought_listing_address: string | null
  archived_at: string
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente', seller: 'Venditore', renter: 'Affittuario',
  landlord: 'Proprietario', other: 'Altro',
}

const PROP_LABELS: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'all' } = await searchParams

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
  if (!profile) redirect('/dashboard')

  // Fetch workspace agents for name lookup
  const { data: agentsData } = await admin
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile.workspace_id)

  const agentMap = new Map<string, string>(
    ((agentsData ?? []) as { id: string; name: string }[]).map(a => [a.id, a.name])
  )

  const [listingsRes, contactsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('archived_listings')
      .select('id, original_id, address, city, neighborhood, price, property_type, sqm, rooms, bathrooms, floor, total_floors, sold, sold_to_name, sold_by_agent_id, agent_id, archived_at')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('archived_contacts')
      .select('id, name, type, phone, email, bought_listing, bought_listing_address, archived_at')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false }),
  ])

  const allListings = (listingsRes.data ?? []) as ArchivedListing[]
  const contacts = (contactsRes.data ?? []) as ArchivedContact[]

  const soldListings = allListings.filter(l => l.sold)
  const removedListings = allListings.filter(l => !l.sold)
  const displayListings = filter === 'sold' ? soldListings : filter === 'removed' ? removedListings : allListings

  const TABS = [
    { id: 'all',     label: `Tutti (${allListings.length})` },
    { id: 'sold',    label: `Venduti (${soldListings.length})` },
    { id: 'removed', label: `Eliminati (${removedListings.length})` },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <Archive className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Archivio</h1>
          <p className="text-sm text-neutral-500">Annunci e clienti rimossi dal database</p>
        </div>
      </div>

      {/* Archived Listings */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">
              Annunci archiviati
            </h2>
          </div>
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden">
            {TABS.map(tab => (
              <Link
                key={tab.id}
                href={`/archive?filter=${tab.id}`}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {displayListings.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Nessun annuncio in questa categoria.</p>
        ) : (
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden">
            {displayListings.map((l) => {
              const sellerAgent = agentMap.get(l.agent_id)
              const soldByAgent = l.sold_by_agent_id ? agentMap.get(l.sold_by_agent_id) : null

              return (
                <Link
                  key={l.id}
                  href={`/archive/${l.id}`}
                  className="flex items-start gap-4 px-4 py-3.5 hover:bg-neutral-50 transition-colors group"
                >
                  {/* Status icon */}
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    l.sold ? 'bg-green-100' : 'bg-neutral-100'
                  }`}>
                    {l.sold
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <Trash2 className="h-3.5 w-3.5 text-neutral-400" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-900 truncate">
                        {l.address}, {l.city}
                      </span>
                      {l.sold ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Venduto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                          <Trash2 className="h-3 w-3" />
                          Eliminato
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 flex-wrap">
                      <span>{PROP_LABELS[l.property_type] ?? l.property_type}</span>
                      <span>€{l.price.toLocaleString('it-IT')}</span>
                      <span>{l.sqm} m²</span>
                      <span>{l.rooms} loc.</span>
                      {sellerAgent && <span className="text-neutral-400">Agente: {sellerAgent}</span>}
                      {l.sold && l.sold_to_name && (
                        <span className="text-green-600 font-medium">→ {l.sold_to_name}</span>
                      )}
                      {l.sold && soldByAgent && (
                        <span className="text-green-600">venduto da {soldByAgent}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-neutral-400 whitespace-nowrap">{fmt(l.archived_at)}</span>
                    <ChevronRight className="h-4 w-4 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Archived Contacts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">
            Clienti archiviati ({contacts.length})
          </h2>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Nessun cliente archiviato.</p>
        ) : (
          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-neutral-900">{c.name}</span>
                    {c.bought_listing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Ha acquistato
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 flex-wrap">
                    <span>{TYPE_LABELS[c.type] ?? c.type}</span>
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.bought_listing && c.bought_listing_address && (
                      <span className="text-blue-600 font-medium">→ {c.bought_listing_address}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">{fmt(c.archived_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
