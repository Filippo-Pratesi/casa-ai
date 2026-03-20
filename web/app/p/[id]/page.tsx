import { notFound } from 'next/navigation'
import { MapPin, Maximize2, Home, Bath, Layers, Euro } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { PhotoGallery } from '@/components/listing/photo-gallery'
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

export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error || !data) notFound()

  const listing = data as Listing
  const photos = (listing.photos_urls ?? []) as string[]
  const features = (listing.features ?? []) as string[]
  const content = listing.generated_content as GeneratedContent | null

  // Fetch workspace for agency name
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', listing.workspace_id)
    .single()

  const agencyName = (wsData as { name: string } | null)?.name

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Agency header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{agencyName ?? 'CasaAI'}</p>
          <p className="text-xs text-muted-foreground">Scheda immobile</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 pb-16">
        {/* Photos */}
        {photos.length > 0 ? (
          <PhotoGallery urls={photos} />
        ) : (
          <div className="flex h-44 items-center justify-center rounded-2xl bg-muted">
            <Home className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{listing.address}</h1>
          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {TYPE_LABELS[listing.property_type]} · {listing.city}
            {listing.neighborhood ? `, ${listing.neighborhood}` : ''}
          </p>
        </div>

        {/* Price */}
        <div className="rounded-2xl bg-[oklch(0.57_0.20_33)] px-6 py-4 text-white">
          <p className="text-xs text-white/70 uppercase tracking-wider mb-1">Prezzo</p>
          <p className="text-3xl font-bold">€{listing.price.toLocaleString('it-IT')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Maximize2 className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-foreground">{listing.sqm}</p>
            <p className="text-xs text-muted-foreground mt-0.5">m²</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Home className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-foreground">{listing.rooms}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Locali</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Bath className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-foreground">{listing.bathrooms}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bagni</p>
          </div>
          {listing.property_type === 'apartment' && listing.floor != null && (
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Layers className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xl font-semibold text-foreground">{listing.floor}</p>
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

        {/* Description */}
        {content?.listing_it && (
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Euro className="h-3 w-3" /> Descrizione
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content.listing_it}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Scheda generata da CasaAI · {agencyName}
        </p>
      </main>
    </div>
  )
}
