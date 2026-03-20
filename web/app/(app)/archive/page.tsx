import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Archive, Home, UserRound, CheckCircle2, Trash2, ChevronRight, Euro, BarChart2 } from 'lucide-react'
import { getTranslations } from '@/lib/i18n/server'
import { ArchiveDateFilter } from '@/components/archive/archive-date-filter'
import { ArchiveExportButtons } from '@/components/archive/archive-export-buttons'
import { RestoreListingButton } from '@/components/archive/restore-listing-button'
import { Suspense } from 'react'

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

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; date_from?: string; date_to?: string }>
}) {
  const { filter = 'all', date_from = '', date_to = '' } = await searchParams
  const { t, locale } = await getTranslations()
  const dateLocale = locale === 'en' ? 'en-GB' : 'it-IT'

  const propLabels: Record<string, string> = {
    apartment: t('property.apartment'),
    house: t('property.house'),
    villa: t('property.villa'),
    commercial: t('property.commercial'),
    land: t('property.land'),
    garage: t('property.garage'),
    other: t('property.other'),
  }

  const typeLabels: Record<string, string> = {
    buyer: t('contacts.type.buyer'),
    seller: t('contacts.type.seller'),
    renter: t('contacts.type.renter'),
    landlord: t('contacts.type.landlord'),
    other: t('contacts.type.other'),
  }

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

  const { data: agentsData } = await admin
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile.workspace_id)

  const agentMap = new Map<string, string>(
    ((agentsData ?? []) as { id: string; name: string }[]).map(a => [a.id, a.name])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listingsQuery = (admin as any)
    .from('archived_listings')
    .select('id, original_id, address, city, neighborhood, price, property_type, sqm, rooms, bathrooms, floor, total_floors, sold, sold_to_name, sold_by_agent_id, agent_id, archived_at')
    .eq('workspace_id', profile.workspace_id)
    .order('archived_at', { ascending: false })
  if (date_from) listingsQuery = listingsQuery.gte('archived_at', date_from)
  if (date_to) listingsQuery = listingsQuery.lte('archived_at', date_to + 'T23:59:59')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contactsQuery = (admin as any)
    .from('archived_contacts')
    .select('id, name, type, phone, email, bought_listing, bought_listing_address, archived_at')
    .eq('workspace_id', profile.workspace_id)
    .order('archived_at', { ascending: false })
  if (date_from) contactsQuery = contactsQuery.gte('archived_at', date_from)
  if (date_to) contactsQuery = contactsQuery.lte('archived_at', date_to + 'T23:59:59')

  const [listingsRes, contactsRes] = await Promise.all([
    listingsQuery,
    contactsQuery,
  ])

  const allListings = (listingsRes.data ?? []) as ArchivedListing[]
  const contacts = (contactsRes.data ?? []) as ArchivedContact[]

  const soldListings = allListings.filter(l => l.sold)
  const removedListings = allListings.filter(l => !l.sold)
  const displayListings = filter === 'sold' ? soldListings : filter === 'removed' ? removedListings : allListings

  // Stats
  const totalValue = soldListings.reduce((acc, l) => acc + l.price, 0)
  const avgPrice = soldListings.length > 0 ? Math.round(totalValue / soldListings.length) : 0

  // Group listings by month
  function getMonthKey(dateStr: string) {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  function getMonthLabel(key: string) {
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })
  }
  const listingsByMonth = new Map<string, typeof displayListings>()
  for (const l of displayListings) {
    const key = getMonthKey(l.archived_at)
    if (!listingsByMonth.has(key)) listingsByMonth.set(key, [])
    listingsByMonth.get(key)!.push(l)
  }
  const monthKeys = Array.from(listingsByMonth.keys()).sort((a, b) => b.localeCompare(a))

  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })

  const monthlyData = (() => {
    const counts: Record<string, number> = {}
    allListings.forEach(l => {
      const month = new Date(l.archived_at || '').toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
      counts[month] = (counts[month] || 0) + 1
    })
    const entries = Object.entries(counts).slice(-6)
    const max = Math.max(...entries.map(([, v]) => v), 1)
    return entries.map(([month, count]) => ({ month, count, max }))
  })()

  const TABS = [
    { id: 'all',     label: `${t('archive.filter.all')} (${allListings.length})` },
    { id: 'sold',    label: `${t('archive.filter.sold')} (${soldListings.length})` },
    { id: 'removed', label: `${t('archive.filter.removed')} (${removedListings.length})` },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="space-y-3 animate-in-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] text-white shadow-md shadow-[oklch(0.57_0.20_33/0.3)]">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Vendite</h1>
            <p className="text-sm text-muted-foreground">{t('archive.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Suspense>
            <ArchiveDateFilter dateFrom={date_from} dateTo={date_to} filter={filter} />
          </Suspense>
          <ArchiveExportButtons />
        </div>
      </div>

      {/* Stats bar */}
      {soldListings.length > 0 && (
        <div className="animate-in-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Home className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Immobili venduti</p>
            </div>
            <p className="text-xl font-bold">{soldListings.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Valore totale</p>
            </div>
            <p className="text-xl font-bold">€{totalValue.toLocaleString(dateLocale)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Prezzo medio</p>
            </div>
            <p className="text-xl font-bold">€{avgPrice.toLocaleString(dateLocale)}</p>
          </div>
        </div>
      )}

      {/* Monthly sales bar chart */}
      {monthlyData.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4 animate-in-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">Vendite mensili</p>
          <div className="flex items-end gap-2 h-20">
            {monthlyData.map(({ month, count, max }) => (
              <div key={month} className="flex flex-col items-center flex-1 gap-1 min-w-0">
                <span className="text-[10px] text-muted-foreground">{count}</span>
                <div className="w-full rounded-t-md bg-[oklch(0.57_0.20_33)]"
                  style={{ height: `${Math.max((count / max) * 64, 4)}px` }} />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archived Listings */}
      <section className="animate-in-3 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('archive.listings.title')}
            </h2>
          </div>
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            {TABS.map(tab => (
              <Link
                key={tab.id}
                href={`/archive?filter=${tab.id}`}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-[oklch(0.57_0.20_33)] text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {displayListings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('archive.empty')}</p>
        ) : (
          <div className="space-y-6">
            {monthKeys.map(monthKey => {
              const monthListings = listingsByMonth.get(monthKey) ?? []
              return (
                <div key={monthKey}>
                  {/* Sticky month header */}
                  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                      {getMonthLabel(monthKey)}
                      <span className="ml-2 text-muted-foreground/50 normal-case">({monthListings.length})</span>
                    </p>
                  </div>
                  <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                    {monthListings.map((l, rowIdx) => {
                      const sellerAgent = agentMap.get(l.agent_id)
                      const soldByAgent = l.sold_by_agent_id ? agentMap.get(l.sold_by_agent_id) : null

                      return (
                        <Link
                          key={l.id}
                          href={`/archive/${l.id}`}
                          className={`flex items-start gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors group ${rowIdx % 2 === 1 ? 'even:bg-muted/30' : ''}`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            l.sold ? 'bg-green-100 dark:bg-green-950' : 'bg-muted'
                          }`}>
                            {l.sold
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              : <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate group-hover:text-[oklch(0.57_0.20_33)] transition-colors">
                                {l.address}, {l.city}
                              </span>
                              {l.sold ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {t('archive.badge.sold')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  <Trash2 className="h-3 w-3" />
                                  {t('archive.badge.removed')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              <span>{propLabels[l.property_type] ?? l.property_type}</span>
                              <span>€{l.price.toLocaleString(dateLocale)}</span>
                              <span>{l.sqm} m²</span>
                              <span>{l.rooms} {locale === 'en' ? 'rooms' : 'loc.'}</span>
                              {sellerAgent && <span>{t('archive.agent')}: {sellerAgent}</span>}
                              {l.sold && l.sold_to_name && (
                                <span className="font-medium">→ {l.sold_to_name}</span>
                              )}
                              {l.sold && soldByAgent && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground">
                                  <span className="h-4 w-4 rounded-full bg-[oklch(0.57_0.20_33)] text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                                    {soldByAgent[0].toUpperCase()}
                                  </span>
                                  {soldByAgent}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(l.archived_at)}</span>
                            <RestoreListingButton archivedId={l.id} address={`${l.address}, ${l.city}`} />
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Archived Contacts */}
      <section className="animate-in-3 space-y-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('archive.contacts.title')} ({contacts.length})
          </h2>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('archive.emptyContacts')}</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-start gap-4 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.bought_listing && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('archive.badge.bought')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    <span>{typeLabels[c.type] ?? c.type}</span>
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span>{c.email}</span>}
                    {c.bought_listing && c.bought_listing_address && (
                      <span className="text-blue-600 font-medium">→ {c.bought_listing_address}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{fmt(c.archived_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
