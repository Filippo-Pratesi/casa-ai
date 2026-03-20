import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Euro, Maximize2, Home, Bath, Layers, Users, Pencil, Mail, AlertTriangle, Database, ExternalLink, Phone, User, Megaphone, Calendar, Info } from 'lucide-react'
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
import { ContactTypeBadges } from '@/components/contacts/contact-type-badges'
import { ShareButton } from '@/components/listing/share-button'
import { BrochureButton } from '@/components/listing/brochure-button'
import { ExportButton } from '@/components/listing/export-button'
import { PriceHistory } from '@/components/listing/price-history'
import { ValuationWidget } from '@/components/listing/valuation-widget'
import { FloorPlanUploader } from '@/components/listing/floor-plan-uploader'
import { ListingStats } from '@/components/listing/listing-stats'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MlsToggle } from '@/components/listing/mls-toggle'
import { ToneRegenerate } from '@/components/listing/tone-regenerate'
import { ListingMatchPanel } from '@/components/listing/match-panel'
import type { Listing, GeneratedContent } from '@/lib/supabase/types'

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


  // Fetch linked property + owner contact
  type LinkedProperty = { id: string; address: string; city: string; stage: string; owner_contact: { id: string; name: string; phone: string | null; email: string | null; type: string | null; types: string[] | null } | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propertyId = (listing as any).property_id
  let linkedProperty: LinkedProperty | null = null
  if (propertyId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: propData } = await (admin as any)
      .from('properties')
      .select('id, address, city, stage, owner_contact:owner_contact_id(id, name, phone, email, type, types)')
      .eq('id', propertyId)
      .single()
    if (propData) linkedProperty = propData as LinkedProperty
  }

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

  // Fetch proposte count (contact_events where event_type = 'immobile_proposto')
  // Fetch visite count (contact_events where event_type = 'appuntamento')
  // Fetch campagne count + cronistoria events for this listing
  const [
    { count: proposteCount },
    { count: visiteCount },
    { count: campagneCount },
    { data: cronistoriaListingData },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_events')
      .select('contact_id', { count: 'exact', head: true })
      .eq('workspace_id', listing.workspace_id)
      .eq('related_listing_id', id)
      .eq('event_type', 'immobile_proposto'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', listing.workspace_id)
      .eq('related_listing_id', id)
      .eq('event_type', 'appuntamento'),
    // Count campaigns that sent this listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_events')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', listing.workspace_id)
      .eq('related_listing_id', id)
      .eq('event_type', 'campagna_inviata'),
    // Cronistoria: property_events (if linked) + contact_events for this listing
    propertyId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (admin as any)
          .from('property_events')
          .select('id, event_type, title, description, event_date, agent:users!property_events_agent_id_fkey(name)')
          .eq('property_id', propertyId)
          .order('event_date', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ])

  // Days on market
  const daysOnMarket = Math.floor((Date.now() - new Date(listing.created_at).getTime()) / 86400000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingContactEventsData } = await (admin as any)
    .from('contact_events')
    .select('id, event_type, title, body, event_date, agent:users!contact_events_agent_id_fkey(name), contact:contacts!contact_events_contact_id_fkey(id, name)')
    .eq('workspace_id', listing.workspace_id)
    .eq('related_listing_id', id)
    .order('event_date', { ascending: false })
    .limit(30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cronistoriaPropertyEvents = ((cronistoriaListingData ?? []) as any[]).map((e) => ({
    id: e.id,
    source: 'property' as const,
    event_type: e.event_type,
    title: e.title,
    description: e.description ?? null,
    event_date: e.event_date,
    agent_name: e.agent?.name ?? null,
    contact_name: null as string | null,
    contact_id: null as string | null,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cronistoriaContactEvents = ((listingContactEventsData ?? []) as any[]).map((e) => ({
    id: e.id,
    source: 'contact' as const,
    event_type: e.event_type,
    title: e.title,
    description: e.body ?? null,
    event_date: e.event_date,
    agent_name: e.agent?.name ?? null,
    contact_name: e.contact?.name ?? null,
    contact_id: e.contact?.id ?? null,
  }))
  const cronistoriaEvents = [...cronistoriaPropertyEvents, ...cronistoriaContactEvents]
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())
    .slice(0, 50)

  // Snapshot linked property as const so TypeScript narrowing works in JSX
  const linkedPropertySnap: LinkedProperty | null = linkedProperty

  return (
    <div className="max-w-6xl mx-auto pb-12">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
    <div className="space-y-6">
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
          {/* Banca Dati link */}
          {linkedPropertySnap && (
            <>
              <Button nativeButton={false} render={<Link href={`/banca-dati/${linkedPropertySnap.id}`} />} variant="outline" size="sm" className="h-8 gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950">
                <Database className="h-3.5 w-3.5" />
                Banca Dati
              </Button>
              <div className="h-5 w-px bg-border" />
            </>
          )}
          {/* Edit & sold cluster */}
          <div className="flex items-center gap-1">
            <Button nativeButton={false} render={<Link href={`/campaigns/new?listing_id=${listing.id}`} />} variant="outline" size="sm" className="h-8 gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-700 dark:hover:bg-purple-950">
              <Megaphone className="h-3.5 w-3.5" />
              Campagna
            </Button>
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

      {/* Performance section */}
      <TooltipProvider>
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Performance</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Proposte */}
            <div className="rounded-xl border border-border bg-teal-50/60 dark:bg-teal-950/20 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Persone a cui è stato proposto questo immobile tramite campagne o manualmente
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-semibold text-teal-700 dark:text-teal-300">{proposteCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Proposte</p>
            </div>
            {/* Visite */}
            <div className="rounded-xl border border-border bg-blue-50/60 dark:bg-blue-950/20 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Appuntamenti di visita registrati per questo immobile
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-semibold text-blue-700 dark:text-blue-300">{visiteCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Visite</p>
            </div>
            {/* Campagne */}
            <div className="rounded-xl border border-border bg-purple-50/60 dark:bg-purple-950/20 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Numero di invii campagna marketing che includono questo annuncio
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-semibold text-purple-700 dark:text-purple-300">{campagneCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Campagne</p>
            </div>
            {/* Giorni in portafoglio */}
            <div className="rounded-xl border border-border bg-amber-50/60 dark:bg-amber-950/20 p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Home className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Giorni da quando l&apos;annuncio è stato aggiunto al portafoglio
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xl font-semibold text-amber-700 dark:text-amber-300">{daysOnMarket}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Giorni</p>
            </div>
          </div>
        </div>
      </TooltipProvider>

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

      {/* Owner card */}
      {linkedPropertySnap?.owner_contact && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Proprietario</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm">{linkedPropertySnap!.owner_contact.name}</p>
                  <ContactTypeBadges
                    types={linkedPropertySnap!.owner_contact.types}
                    type={linkedPropertySnap!.owner_contact.type}
                    size="xs"
                  />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {linkedPropertySnap!.owner_contact.phone && (
                    <a href={`tel:${linkedPropertySnap!.owner_contact.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-3 w-3" />
                      {linkedPropertySnap!.owner_contact.phone}
                    </a>
                  )}
                  {linkedPropertySnap!.owner_contact.email && (
                    <a href={`mailto:${linkedPropertySnap!.owner_contact.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-3 w-3" />
                      {linkedPropertySnap!.owner_contact.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/contacts/${linkedPropertySnap!.owner_contact.id}`} className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Scheda<ExternalLink className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* AI Match Engine — pre-computed matches from match_results */}
      {propertyId && <ListingMatchPanel propertyId={propertyId} />}

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

    {/* Right sidebar: cronistoria */}
    {cronistoriaEvents.length > 0 && (
      <div className="hidden lg:block lg:sticky lg:top-4 space-y-3">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Cronistoria</p>
          <ul role="list" className="border-l-2 border-border pl-3 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
            {cronistoriaEvents.map((ev) => (
              <li key={`${ev.source}-${ev.id}`} className="relative">
                <div className="absolute -left-[17px] top-1 h-3 w-3 rounded-full border-2 border-background bg-[oklch(0.57_0.20_33)]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium leading-tight">{ev.title}</p>
                  {ev.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-medium rounded bg-muted px-1 py-0.5 text-muted-foreground">{ev.event_type}</span>
                    {ev.source === 'contact' && ev.contact_name && (
                      <Link href={`/contacts/${ev.contact_id}`} className="text-[9px] text-[oklch(0.57_0.20_33)] hover:underline">
                        {ev.contact_name}
                      </Link>
                    )}
                  </div>
                  <time className="text-[9px] text-muted-foreground/50 block">
                    {new Date(ev.event_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {ev.agent_name ? ` · ${ev.agent_name}` : ''}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
    </div>
    </div>
  )
}
