import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Euro, Maximize2, Home, Bath, Layers, Users, Pencil, Mail, AlertTriangle } from 'lucide-react'
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
import { ListingStats } from '@/components/listing/listing-stats'
import { MlsToggle } from '@/components/listing/mls-toggle'
import { ToneRegenerate } from '@/components/listing/tone-regenerate'
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
  standard: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  luxury: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  approachable: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  investment: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
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
  if (!user) redirect('/login')

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
    .eq('user_id', user.id)

  const connectedPlatforms = new Set(
    ((connectionsData ?? []) as { platform: string }[]).map((c) => c.platform)
  )

  const photos = (listing.photos_urls ?? []) as string[]
  const features = (listing.features ?? []) as string[]

  // Fetch sold comparables for valuation widget
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let comparablesQuery = (admin as any)
    .from('archived_listings')
    .select('address, price, sqm, rooms')
    .eq('workspace_id', listing.workspace_id)
    .eq('sold', true)
    .limit(5)
  if (listing.city) comparablesQuery = comparablesQuery.ilike('city', listing.city)
  if (listing.rooms != null) {
    comparablesQuery = comparablesQuery.gte('rooms', listing.rooms - 1).lte('rooms', listing.rooms + 1)
  }
  const { data: comparablesData } = await comparablesQuery

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
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string } | null

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
    if (listing.price != null && c.budget_max !== null && c.budget_max < listing.price) return false
    if (listing.city && c.preferred_cities.length > 0 && !c.preferred_cities.map(s => s.toLowerCase()).includes(listing.city.toLowerCase())) return false
    if (c.preferred_types.length > 0 && listing.property_type && !c.preferred_types.includes(listing.property_type)) return false
    if (listing.rooms != null && c.min_rooms !== null && c.min_rooms > listing.rooms) return false
    if (listing.sqm != null && c.min_sqm !== null && c.min_sqm > listing.sqm) return false
    return true
  }).slice(0, 6)

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back nav + delete */}
      <div className="flex items-center justify-between animate-in-1">
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export cluster */}
          <div className="flex items-center gap-1">
            <BrochureButton listingId={listing.id} />
            <ExportButton listingId={listing.id} />
            <ShareButton listingId={listing.id} />
          </div>
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          {/* Edit & sold cluster */}
          <div className="flex items-center gap-1">
            <Button nativeButton={false} render={<Link href={`/listing/${listing.id}/edit`} />} variant="outline" size="sm" className="h-8 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Modifica
            </Button>
            <MarkAsSoldButton listingId={listing.id} address={listing.address} workspaceMembers={workspaceMembers} />
          </div>
          {/* Separator */}
          <div className="h-5 w-px bg-border" />
          {/* Destructive action — visually separated */}
          <DeleteListingButton listingId={listing.id} address={listing.address} />
        </div>
      </div>

      {/* Hero: photos */}
      {photos.length > 0 ? (
        <PhotoGallery urls={photos} floorPlanUrl={(listing as unknown as { floor_plan_url: string | null }).floor_plan_url} />
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl bg-muted/50">
          <Home className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Title */}
      <div className="animate-in-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{listing.address}</h1>
        <p className="mt-1 text-muted-foreground">
          {TYPE_LABELS[listing.property_type]} · {listing.city}
          {listing.neighborhood ? `, ${listing.neighborhood}` : ''}
        </p>
      </div>

      {/* Tone selector + regenerate */}
      <ToneRegenerate listingId={listing.id} currentTone={listing.tone} />

      {/* Price prominent */}
      <div className="rounded-2xl border-2 border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33/0.06)] px-6 py-4">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">PREZZO</p>
        <p className="text-[oklch(0.57_0.20_33)] text-3xl font-bold">
          {listing.price != null ? `€${listing.price.toLocaleString('it-IT')}` : <span className="text-muted-foreground text-xl">Da definire</span>}
        </p>
      </div>

      {/* MLS toggle (admins only) */}
      {(profile?.role === 'admin' || profile?.role === 'group_admin') && (
        <MlsToggle
          listingId={listing.id}
          initialShared={(listing as unknown as { shared_with_group: boolean }).shared_with_group ?? false}
        />
      )}

      {/* Listing stats */}
      <ListingStats
        listingId={listing.id}
        viewCount={(listing as unknown as { view_count: number }).view_count ?? 0}
        shareCount={(listing as unknown as { share_count: number }).share_count ?? 0}
        portalClickCount={(listing as unknown as { portal_click_count: number }).portal_click_count ?? 0}
      />

      {/* Price history */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Storico prezzi</p>
        <PriceHistory
          listingId={listing.id}
          currentPrice={listing.price ?? 0}
          history={priceHistory}
        />
      </div>

      {/* Valuation widget */}
      {comparables.length > 0 && listing.price != null && listing.sqm != null && (
        <ValuationWidget
          currentPrice={listing.price}
          currentSqm={listing.sqm}
          comparables={comparables}
        />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Maximize2 className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold">{listing.sqm ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">m²</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Home className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold">{listing.rooms ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Locali</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Bath className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold">{listing.bathrooms ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Bagni</p>
        </div>
        {listing.property_type === 'apartment' && listing.floor != null && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <Layers className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xl font-semibold">{listing.floor}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
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
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Note agente</p>
          <p className="text-sm">{listing.notes}</p>
        </div>
      )}

      {/* Catastral data */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {((listing as any).foglio || (listing as any).particella || (listing as any).rendita_catastale) && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dati catastali</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).foglio && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Foglio</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium">{(listing as any).foglio}</p>
              </div>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).particella && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Particella</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium">{(listing as any).particella}</p>
              </div>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(listing as any).subalterno && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Subalterno</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium">{(listing as any).subalterno}</p>
              </div>
            )}
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(listing as any).rendita_catastale && (
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
              <div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(listing as any).categoria_catastale && (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Categoria</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p className="font-medium">{(listing as any).categoria_catastale}</p>
                  </>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Rendita catastale</p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="font-medium">€ {Number((listing as any).rendita_catastale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 rounded-lg bg-[oklch(0.57_0.20_33/0.08)] border border-[oklch(0.57_0.20_33/0.2)] px-3 py-2">
                <p className="text-[10px] text-[oklch(0.57_0.20_33)] uppercase tracking-wide">Valore catastale stimato</p>
                <p className="text-lg font-bold text-[oklch(0.40_0.16_33)]">
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
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Acquirenti compatibili</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{matchingContacts.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matchingContacts.slice(0, 6).map((c) => {
              const phone = c.phone?.replace(/\D/g, '') ?? ''
              const priceStr = listing.price != null ? `€${listing.price.toLocaleString('it-IT')}` : 'prezzo da definire'
              const locationStr = [listing.address, listing.city].filter(Boolean).join(', ')
              const waText = `Buongiorno ${c.name},\n\nHo pensato a lei per un immobile che potrebbe interessarla:\n📍 ${locationStr}\n💶 ${priceStr}\n\nSarebbe disponibile per una visita?`
              const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}` : null
              const emailSubject = `Immobile per lei — ${locationStr}`
              const emailBody = `Buongiorno ${c.name},\n\nHo pensato a lei per un immobile:\n\n${locationStr}\nPrezzo: ${priceStr}\n${listing.sqm != null ? `${listing.sqm} m²` : ''}${listing.sqm != null && listing.rooms != null ? ' · ' : ''}${listing.rooms != null ? `${listing.rooms} locali` : ''}\n\nSarebbe disponibile per una visita?\n\nCordiali saluti`
              const emailUrl = c.email ? `mailto:${c.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : null
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <a href={`/contacts/${c.id}`} className="min-w-0 flex-1 hover:opacity-75 transition-opacity">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.budget_max && (
                      <p className="text-xs text-muted-foreground mt-0.5">Budget max €{c.budget_max.toLocaleString('it-IT')}</p>
                    )}
                  </a>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {waUrl && (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer" title="Invia WhatsApp"
                        className="rounded-full bg-card border border-border p-1.5 hover:bg-green-50 hover:border-green-200 transition-colors">
                        <svg className="h-3.5 w-3.5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      </a>
                    )}
                    {emailUrl && (
                      <a href={emailUrl} title="Invia email"
                        className="rounded-full bg-card border border-border p-1.5 hover:bg-[oklch(0.57_0.20_33/0.08)] hover:border-[oklch(0.57_0.20_33/0.3)] transition-colors">
                        <Mail className="h-3.5 w-3.5 text-[oklch(0.57_0.20_33)]" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {matchingContacts.length > 6 && (
            <p className="text-xs text-muted-foreground text-center">+ {matchingContacts.length - 6} altri</p>
          )}
        </div>
      )}

      {/* Floor plan */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Planimetria</p>
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
          <span className="text-sm text-muted-foreground shrink-0">Pubblica:</span>
          <SocialPublishButtons
            listingId={listing.id}
            hasPhotos={photos.length > 0}
            instagramConnected={connectedPlatforms.has('instagram')}
            facebookConnected={connectedPlatforms.has('facebook')}
          />
        </div>
      )}

      {/* Stale price warning */}
      {priceHistory.length > 0 && listing.generated_content && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Il prezzo è cambiato dopo l&apos;ultima generazione. Considera di rigenerare il contenuto.</span>
          <span className="ml-auto"><GenerateContentButton listingId={listing.id} /></span>
        </div>
      )}

      {/* Output */}
      {listing.generated_content ? (
        <OutputTabs
          listingId={listing.id}
          initialContent={listing.generated_content as GeneratedContent}
        />
      ) : (
        <div className="mesh-bg rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
              <Euro className="h-7 w-7 text-white" />
            </div>
          </div>
          <p className="font-semibold mb-1">Contenuto non ancora generato</p>
          <p className="text-sm text-muted-foreground mb-5">Genera descrizioni, post social e molto altro con un click.</p>
          <GenerateContentButton listingId={listing.id} />
        </div>
      )}
    </div>
  )
}
