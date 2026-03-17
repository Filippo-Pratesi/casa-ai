import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Euro, Maximize2, Home, Bath, Layers, Users, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OutputTabs } from '@/components/listing/output-tabs'
import { SocialPublishButtons } from '@/components/listing/social-publish-buttons'
import { GenerateContentButton } from '@/components/listing/generate-content-button'
import { PhotoGallery } from '@/components/listing/photo-gallery'
import { DeleteListingButton } from '@/components/listing/delete-listing-button'
import { MarkAsSoldButton } from '@/components/listing/mark-as-sold-button'
import { AttachmentsSection } from '@/components/shared/attachments-section'
import { ShareButton } from '@/components/listing/share-button'
import { BrochureButton } from '@/components/listing/brochure-button'
import { ExportButton } from '@/components/listing/export-button'
import { PriceHistory } from '@/components/listing/price-history'
import { ValuationWidget } from '@/components/listing/valuation-widget'
import { FloorPlanUploader } from '@/components/listing/floor-plan-uploader'
import { NotifyBuyersButton } from '@/components/listing/notify-buyers-button'
import type { Listing, GeneratedContent } from '@/lib/supabase/types'

interface MatchingContact {
  id: string
  name: string
  phone: string | null
  email: string | null
  type: string
  budget_max: number | null
  preferred_cities: string[]
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

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

const TONE_COLORS: Record<string, string> = {
  standard: 'bg-blue-50 text-blue-700 border-blue-100',
  luxury: 'bg-amber-50 text-amber-700 border-amber-100',
  approachable: 'bg-green-50 text-green-700 border-green-100',
  investment: 'bg-purple-50 text-purple-700 border-purple-100',
}

const FEATURE_LABELS: Record<string, string> = {
  terrace: 'Terrazzo',
  garage: 'Garage',
  elevator: 'Ascensore',
  parking: 'Posto auto',
  renovated_kitchen: 'Cucina ristrutturata',
  sea_view: 'Vista mare',
  garden: 'Giardino',
  storage: 'Ripostiglio',
  cellar: 'Cantina',
  panoramic_view: 'Vista panoramica',
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const listing = data as Listing

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connectionsData } = await (admin as any)
    .from('social_connections')
    .select('platform')
    .eq('user_id', user!.id)

  const connectedPlatforms = new Set(
    ((connectionsData ?? []) as { platform: string }[]).map((c) => c.platform)
  )

  const photos = (listing.photos_urls ?? []) as string[]
  const features = (listing.features ?? []) as string[]

  // Fetch sold comparables for valuation widget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: comparablesData } = await (admin as any)
    .from('archived_listings')
    .select('address, price, sqm, rooms')
    .eq('workspace_id', listing.workspace_id)
    .eq('sold', true)
    .ilike('city', listing.city)
    .gte('rooms', listing.rooms - 1)
    .lte('rooms', listing.rooms + 1)
    .limit(5)

  const comparables = (comparablesData ?? []) as { address: string; price: number; sqm: number; rooms: number }[]

  // Match buyers/renters whose preferences align with this listing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allBuyerContacts } = await (admin as any)
    .from('contacts')
    .select('id, name, phone, email, type, budget_max, preferred_cities, preferred_types, min_rooms, min_sqm')
    .eq('workspace_id', listing.workspace_id)
    .in('type', ['buyer', 'renter'])

  // Fetch workspace members for "mark as sold" flow
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user!.id)
    .single()
  const profile = profileData as { workspace_id: string } | null

  const { data: membersData } = await admin
    .from('users')
    .select('id, name')
    .eq('workspace_id', profile?.workspace_id ?? '')
    .order('name', { ascending: true })
  const workspaceMembers = (membersData ?? []) as { id: string; name: string }[]

  // Fetch price history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: priceHistoryData } = await (admin as any)
    .from('listing_price_history')
    .select('id, old_price, new_price, changed_at')
    .eq('listing_id', id)
    .order('changed_at', { ascending: false })
  const priceHistory = (priceHistoryData ?? []) as { id: string; old_price: number; new_price: number; changed_at: string }[]

  const matchingContacts: MatchingContact[] = ((allBuyerContacts ?? []) as Array<{
    id: string; name: string; phone: string | null; email: string | null
    type: string; budget_max: number | null; preferred_cities: string[]
    preferred_types: string[]; min_rooms: number | null; min_sqm: number | null
  }>).filter(c => {
    if (c.budget_max !== null && c.budget_max < listing.price) return false
    if (c.preferred_cities.length > 0 && !c.preferred_cities.map(s => s.toLowerCase()).includes(listing.city.toLowerCase())) return false
    if (c.preferred_types.length > 0 && !c.preferred_types.includes(listing.property_type)) return false
    if (c.min_rooms !== null && c.min_rooms > listing.rooms) return false
    if (c.min_sqm !== null && c.min_sqm > listing.sqm) return false
    return true
  }).slice(0, 6)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back nav + delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-neutral-500">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <BrochureButton listingId={listing.id} />
          <ExportButton listingId={listing.id} />
          <ShareButton listingId={listing.id} />
          <MarkAsSoldButton listingId={listing.id} address={listing.address} workspaceMembers={workspaceMembers} />
          <DeleteListingButton listingId={listing.id} address={listing.address} />
        </div>
      </div>

      {/* Hero: photos */}
      {photos.length > 0 ? (
        <PhotoGallery urls={photos} floorPlanUrl={(listing as unknown as { floor_plan_url: string | null }).floor_plan_url} />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl bg-neutral-100">
          <Home className="h-10 w-10 text-neutral-300" />
        </div>
      )}

      {/* Title + tone */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{listing.address}</h1>
          <p className="mt-1 text-neutral-500">
            {TYPE_LABELS[listing.property_type]} · {listing.city}
            {listing.neighborhood ? `, ${listing.neighborhood}` : ''}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${TONE_COLORS[listing.tone]}`}>
          {TONE_LABELS[listing.tone]}
        </span>
      </div>

      {/* Price prominent */}
      <div className="rounded-2xl bg-neutral-900 px-6 py-4 text-white">
        <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">Prezzo</p>
        <p className="text-3xl font-bold">€{listing.price.toLocaleString('it-IT')}</p>
      </div>

      {/* Price history */}
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4">
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Storico prezzi</p>
        <PriceHistory
          listingId={listing.id}
          currentPrice={listing.price}
          history={priceHistory}
        />
      </div>

      {/* Valuation widget */}
      {comparables.length > 0 && (
        <ValuationWidget
          currentPrice={listing.price}
          currentSqm={listing.sqm}
          comparables={comparables}
        />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
          <Maximize2 className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-neutral-900">{listing.sqm}</p>
          <p className="text-xs text-neutral-500 mt-0.5">m²</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
          <Home className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-neutral-900">{listing.rooms}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Locali</p>
        </div>
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
          <Bath className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-neutral-900">{listing.bathrooms}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Bagni</p>
        </div>
        {listing.property_type === 'apartment' && listing.floor != null && (
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-center">
            <Layers className="h-4 w-4 text-neutral-400 mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-neutral-900">{listing.floor}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Piano{listing.total_floors ? ` / ${listing.total_floors}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Features */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {features.map((f) => (
            <Badge key={f} variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {FEATURE_LABELS[f] ?? f}
            </Badge>
          ))}
        </div>
      )}

      {/* Agent notes */}
      {listing.notes && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Note agente</p>
          <p className="text-sm text-neutral-700">{listing.notes}</p>
        </div>
      )}

      {/* Catastral data */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {((listing as any).foglio || (listing as any).particella || (listing as any).rendita_catastale) && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4 space-y-3">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Dati catastali</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).foglio && (
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Foglio</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium text-neutral-800">{(listing as any).foglio}</p>
              </div>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).particella && (
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Particella</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium text-neutral-800">{(listing as any).particella}</p>
              </div>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).subalterno && (
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Subalterno</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium text-neutral-800">{(listing as any).subalterno}</p>
              </div>
            )}
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(listing as any).rendita_catastale && (
            <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3">
              <div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(listing as any).categoria_catastale && (
                  <>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Categoria</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p className="font-medium text-neutral-800">{(listing as any).categoria_catastale}</p>
                  </>
                )}
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Rendita catastale</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium text-neutral-800">€ {Number((listing as any).rendita_catastale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-[10px] text-blue-400 uppercase tracking-wide">Valore catastale stimato</p>
                <p className="text-lg font-bold text-blue-900">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  € {Math.round(Number((listing as any).rendita_catastale) * 1.05 * (() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const cat = ((listing as any).categoria_catastale ?? '').toUpperCase().trim()
                    if (['A/1','A/8','A/9'].includes(cat)) return 140
                    if (cat.startsWith('C/1')) return 42
                    if (cat.startsWith('D')) return 60
                    if (cat.startsWith('E')) return 40
                    if (cat.startsWith('B') || cat.startsWith('C')) return 140
                    return 160
                  })()).toLocaleString('it-IT')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Matching buyers */}
      {matchingContacts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-700">Acquirenti compatibili</h2>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">{matchingContacts.length}</span>
            <div className="ml-auto">
              <NotifyBuyersButton listingId={listing.id} count={matchingContacts.length} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matchingContacts.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                <a href={`/contacts/${c.id}`} className="min-w-0 flex-1 hover:opacity-75 transition-opacity">
                  <p className="text-sm font-medium text-neutral-900 truncate">{c.name}</p>
                  {c.budget_max && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Budget max €{c.budget_max.toLocaleString('it-IT')}
                    </p>
                  )}
                </a>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="ml-3 shrink-0 rounded-full bg-white border border-neutral-200 p-1.5 hover:bg-neutral-50 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-neutral-500" />
                  </a>
                )}
              </div>
            ))}
          </div>
          {matchingContacts.length > 5 && (
            <p className="text-xs text-neutral-500 text-center">+ {matchingContacts.length - 5} altri</p>
          )}
        </div>
      )}

      {/* Floor plan */}
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4 space-y-3">
        <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Planimetria</p>
        <FloorPlanUploader
          listingId={listing.id}
          initialUrl={(listing as unknown as { floor_plan_url: string | null }).floor_plan_url ?? null}
        />
      </div>

      {/* Attachments */}
      <AttachmentsSection
        entityId={listing.id}
        apiBase={`/api/listing/${listing.id}/attachments`}
        downloadBase={`/api/listing/${listing.id}/attachments/download`}
        label="Documenti allegati (planimetrie, APE, ecc.)"
      />

      {/* Social publish buttons */}
      {listing.generated_content && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500 shrink-0">Pubblica:</span>
          <SocialPublishButtons
            listingId={listing.id}
            hasPhotos={photos.length > 0}
            instagramConnected={connectedPlatforms.has('instagram')}
            facebookConnected={connectedPlatforms.has('facebook')}
          />
        </div>
      )}

      {/* Output */}
      {listing.generated_content ? (
        <OutputTabs
          listingId={listing.id}
          initialContent={listing.generated_content as GeneratedContent}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-12 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-neutral-100 p-3">
              <Euro className="h-6 w-6 text-neutral-400" />
            </div>
          </div>
          <p className="text-neutral-600 font-medium mb-1">Contenuto non ancora generato</p>
          <p className="text-sm text-neutral-400 mb-5">Genera descrizioni, post social e molto altro con un click.</p>
          <GenerateContentButton listingId={listing.id} />
        </div>
      )}
    </div>
  )
}
