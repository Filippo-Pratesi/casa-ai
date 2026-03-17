import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusSquare, FileText, Euro, Maximize2, Home, User } from 'lucide-react'
import type { Listing } from '@/lib/supabase/types'

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

type ListingWithAgent = Listing & { agent: { name: string } | null }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function ListingHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', user!.id)
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
    query = query.eq('agent_id', user!.id)
  }

  const { data: listings } = await query
  const items = (listings ?? []) as ListingWithAgent[]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Storico annunci</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {isAdmin ? 'Tutti gli annunci del workspace' : `${items.length} annunci`}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/listing/new" />} className="gap-2">
          <PlusSquare className="h-4 w-4" />
          Nuovo annuncio
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <FileText className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">Nessun annuncio ancora</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">
            Crea il primo annuncio e genera descrizioni, post social e molto altro in pochi secondi.
          </p>
          <Button nativeButton={false} render={<Link href="/listing/new" />} className="mt-6 gap-2">
            <PlusSquare className="h-4 w-4" />
            Crea il primo annuncio
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => {
            const thumb = Array.isArray(listing.photos_urls) && listing.photos_urls.length > 0
              ? (listing.photos_urls as string[])[0]
              : null

            return (
              <Link key={listing.id} href={`/listing/${listing.id}`} className="group block">
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                  {/* Photo / placeholder */}
                  <div className="relative h-44 w-full bg-neutral-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={listing.address}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Home className="h-10 w-10 text-neutral-300" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      {listing.generated_content ? (
                        <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white shadow">
                          Generato
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-neutral-800/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          Bozza
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-neutral-900 truncate text-sm leading-snug">
                        {listing.address}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {TYPE_LABELS[listing.property_type]} · {listing.city}
                        {listing.property_type === 'apartment' && listing.floor != null
                          ? ` · Piano ${listing.floor}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                      <span className="flex items-center gap-1 font-medium">
                        <Euro className="h-3 w-3 text-neutral-400" />
                        {listing.price.toLocaleString('it-IT')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-3 w-3 text-neutral-400" />
                        {listing.sqm} m²
                      </span>
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3 text-neutral-400" />
                        {listing.rooms} loc.
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <User className="h-3 w-3" />
                        {listing.agent?.name ?? '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {TONE_LABELS[listing.tone]}
                        </Badge>
                        <span className="text-[11px] text-neutral-400">
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
      )}
    </div>
  )
}
