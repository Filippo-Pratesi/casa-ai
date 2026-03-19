import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { PlusSquare, FileText, Euro, Maximize2, Home, User } from 'lucide-react'
import type { Listing } from '@/lib/supabase/types'
import { ListingTransactionFilter } from '@/components/listing/listing-transaction-filter'
import { ListingViewToggle } from '@/components/listing/listing-view-toggle'

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

type ListingWithAgent = Listing & { agent: { name: string } | null; transaction_type?: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ListingHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction_type?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { transaction_type } = await searchParams

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; workspace_id: string } | null
  const isAdmin = profile?.role === 'admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('listings')
    .select('*, agent:users!agent_id(name)')
    .eq('workspace_id', profile?.workspace_id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isAdmin) {
    query = query.eq('agent_id', user.id)
  }

  if (transaction_type === 'vendita' || transaction_type === 'affitto') {
    query = query.eq('transaction_type', transaction_type)
  }

  const { data: listings } = await query
  const items = (listings ?? []) as ListingWithAgent[]

  // Fetch lat/lng for listings that have a property_id
  const propertyIds = items.map((l: Listing & { property_id?: string }) => l.property_id).filter(Boolean) as string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propsGeo } = propertyIds.length > 0
    ? await (admin as any).from('properties').select('id, lat, lng').in('id', propertyIds)
    : { data: [] }

  const geoMap = new Map<string, { lat: number; lng: number }>(
    ((propsGeo ?? []) as { id: string; lat: number | null; lng: number | null }[])
      .filter(p => p.lat != null && p.lng != null)
      .map(p => [p.id, { lat: p.lat!, lng: p.lng! }])
  )

  const mapListings = items
    .filter((l: Listing & { property_id?: string }) => l.property_id && geoMap.has(l.property_id))
    .map((l: Listing & { property_id?: string; transaction_type?: string }) => ({
      id: l.id,
      address: l.address,
      city: l.city,
      price: l.price,
      sqm: l.sqm,
      lat: geoMap.get(l.property_id!)!.lat,
      lng: geoMap.get(l.property_id!)!.lng,
      transaction_type: l.transaction_type ?? null,
    }))

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4 animate-in-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)]">
            <Home className="h-5 w-5 text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Annunci</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Tutti gli annunci del workspace' : `${items.length} annunci`}
            </p>
          </div>
        </div>
        <Link href="/listing/new" className="btn-ai shrink-0 gap-2">
          <PlusSquare className="h-4 w-4" />
          Nuovo annuncio
        </Link>
      </div>

      <ListingTransactionFilter active={transaction_type} />

      {items.length === 0 ? (
        <div className="animate-in-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border mesh-bg py-20 text-center">

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Nessun annuncio ancora</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Crea il primo annuncio e genera descrizioni, post social e molto altro in pochi secondi.
          </p>
          <Link href="/listing/new" className="btn-ai mt-6 gap-2">
            <PlusSquare className="h-4 w-4" />
            Crea il primo annuncio
          </Link>
        </div>
      ) : (
        <ListingViewToggle mapListings={mapListings}>
        <div className="animate-in-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((listing) => {
            const thumb = Array.isArray(listing.photos_urls) && listing.photos_urls.length > 0
              ? (listing.photos_urls as string[])[0]
              : null

            return (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="group block">
                <div className="card-lift overflow-hidden rounded-2xl border border-border bg-card">
                  {/* Photo / placeholder */}
                  <div className="relative h-44 w-full bg-muted">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={listing.address}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Home className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      {listing.generated_content ? (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white shadow">
                          Generato
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-foreground/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          Bozza
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground truncate text-sm leading-snug">
                        {listing.address}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {listing.transaction_type === 'affitto' ? (
                          <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-1.5 py-0 text-[10px] font-medium mr-1">Affitto</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0 text-[10px] font-medium mr-1">Vendita</span>
                        )}
                        {TYPE_LABELS[listing.property_type]} · {listing.city}
                        {listing.property_type === 'apartment' && listing.floor != null
                          ? ` · Piano ${listing.floor}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Euro className="h-3 w-3 text-muted-foreground" />
                        {listing.price.toLocaleString('it-IT')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-3 w-3 text-muted-foreground" />
                        {listing.sqm} m²
                      </span>
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3 text-muted-foreground" />
                        {listing.rooms} loc.
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {listing.agent?.name ?? '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {TONE_LABELS[listing.tone]}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(listing.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
        </ListingViewToggle>
      )}
    </div>
  )
}
