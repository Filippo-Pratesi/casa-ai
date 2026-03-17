import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Euro, Home, Maximize2, Bath, MapPin, Layers, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

export default async function MlsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, workspaces(group_id)')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; workspaces: { group_id: string | null } } | null
  if (!profile?.workspaces?.group_id) redirect('/mls')

  // Verify this listing belongs to a sibling workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingData } = await (admin as any)
    .from('listings')
    .select('*, workspaces(name, group_id)')
    .eq('id', id)
    .eq('shared_with_group', true)
    .single()

  if (!listingData) notFound()

  const l = listingData as {
    id: string; address: string; city: string; price: number; sqm: number
    rooms: number; bathrooms: number; property_type: string; floor: number | null
    total_floors: number | null; notes: string | null; photos_urls: string[]
    workspace_id: string; neighborhood: string | null
    workspaces: { name: string; group_id: string }
  }

  // Must be in same group
  if (l.workspaces.group_id !== profile.workspaces.group_id) notFound()
  // Must not be own workspace
  if (l.workspace_id === profile.workspace_id) redirect(`/listing/${id}`)

  const photos = (l.photos_urls ?? []) as string[]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Nav */}
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href="/mls" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">MLS — Rete annunci</span>
      </div>

      {/* Agency banner */}
      <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
        <span className="text-sm text-blue-700 font-medium">Immobile di: {l.workspaces.name}</span>
        <span className="ml-auto text-xs text-blue-400">Solo lettura</span>
      </div>

      {/* Photos */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
          {photos.slice(0, 4).map((url, i) => (
            <div key={i} className={`${i === 0 && photos.length > 1 ? 'col-span-2' : ''} aspect-video overflow-hidden`}>
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-2xl bg-muted">
          <Home className="h-10 w-10 text-muted-foreground/50" />
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{l.address}</h1>
        <p className="mt-1 text-muted-foreground">
          {PROPERTY_TYPE_LABELS[l.property_type]} · {l.city}
          {l.neighborhood ? `, ${l.neighborhood}` : ''}
        </p>
      </div>

      {/* Price */}
      <div className="rounded-2xl bg-[oklch(0.57_0.20_33)] px-6 py-4 text-white">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prezzo</p>
        <p className="text-3xl font-bold">€{l.price.toLocaleString('it-IT')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Maximize2 className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-foreground">{l.sqm}</p>
          <p className="text-xs text-muted-foreground mt-0.5">m²</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Home className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-foreground">{l.rooms}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Locali</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <Bath className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-foreground">{l.bathrooms}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Bagni</p>
        </div>
        {l.floor != null && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
            <Layers className="h-4 w-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-foreground">{l.floor}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Piano{l.total_floors ? ` / ${l.total_floors}` : ''}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      {l.notes && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Note</p>
          <p className="text-sm text-foreground">{l.notes}</p>
        </div>
      )}

      {/* Contact agency CTA */}
      <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Contatta l&apos;agenzia</p>
        <p className="text-sm text-muted-foreground">Per maggiori informazioni su questo immobile, contatta {l.workspaces.name}.</p>
        <a
          href={`mailto:info@casaai.it?subject=Richiesta info MLS: ${l.address}, ${l.city}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[oklch(0.57_0.20_33)] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-colors"
        >
          <Phone className="h-4 w-4" />
          Contatta agenzia
        </a>
      </div>
    </div>
  )
}
