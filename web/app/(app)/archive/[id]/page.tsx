import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ArrowLeft, CheckCircle2, Trash2, Home, Euro, Maximize2,
  BedDouble, Bath, Building2, MapPin, User, CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PROP_LABELS: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

const FEATURE_LABELS: Record<string, string> = {
  terrace: 'Terrazza', garage: 'Garage', elevator: 'Ascensore', parking: 'Parcheggio',
  renovated_kitchen: 'Cucina ristrutturata', sea_view: 'Vista mare', garden: 'Giardino',
  storage: 'Ripostiglio', cellar: 'Cantina', panoramic_view: 'Vista panoramica',
}

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard', luxury: 'Luxury', approachable: 'Accessibile', investment: 'Investimento',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default async function ArchivedListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) redirect('/dashboard')
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingData } = await (admin as any)
    .from('archived_listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!listingData) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l = listingData as Record<string, any>

  // Fetch agent names
  const agentIds = [l.agent_id, l.sold_by_agent_id].filter(Boolean)
  const { data: agentsData } = await admin
    .from('users')
    .select('id, name')
    .in('id', agentIds)

  const agentMap = new Map<string, string>(
    ((agentsData ?? []) as { id: string; name: string }[]).map(a => [a.id, a.name])
  )

  // Fetch internal buyer contact if present
  let buyerContact: { id: string; name: string } | null = null
  if (l.sold_to_contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactData } = await (admin as any)
      .from('contacts')
      .select('id, name')
      .eq('id', l.sold_to_contact_id)
      .single()
    buyerContact = contactData ?? null
  }

  const features: string[] = Array.isArray(l.features) ? l.features : []
  const generatedContent = l.generated_content as Record<string, string> | null

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Nav */}
      <div className="flex items-center gap-2">
        <Link
          href="/archive"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Archivio
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          l.sold ? 'bg-green-100' : 'bg-muted'
        }`}>
          {l.sold
            ? <CheckCircle2 className="h-6 w-6 text-green-600" />
            : <Trash2 className="h-6 w-6 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{l.address}</h1>
            {l.sold ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Venduto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminato
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {l.city}{l.neighborhood ? `, ${l.neighborhood}` : ''} · Archiviato il {fmt(l.archived_at)}
          </p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold">€{Number(l.price).toLocaleString('it-IT')}</p>
                <p className="text-[11px] text-muted-foreground">Prezzo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold">{l.sqm} m²</p>
                <p className="text-[11px] text-muted-foreground">Superficie</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold">{l.rooms}</p>
                <p className="text-[11px] text-muted-foreground">Locali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-lg font-bold">{l.bathrooms}</p>
                <p className="text-[11px] text-muted-foreground">Bagni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Home className="h-4 w-4 text-muted-foreground" />
            Dettagli immobile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Tipo</p>
            <p className="font-medium">{PROP_LABELS[l.property_type] ?? l.property_type}</p>
          </div>
          {l.floor != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Piano</p>
              <p className="font-medium">{l.floor}{l.total_floors ? ` / ${l.total_floors}` : ''}</p>
            </div>
          )}
          {l.condition && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Condizione</p>
              <p className="font-medium">{l.condition}</p>
            </div>
          )}
          {l.tone && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Tono AI</p>
              <p className="font-medium">{TONE_LABELS[l.tone] ?? l.tone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Agente</p>
            {isAdmin && l.agent_id ? (
              <Link href={`/admin/agents/${l.agent_id}`} className="font-medium text-foreground hover:underline">
                {agentMap.get(l.agent_id) ?? '—'}
              </Link>
            ) : (
              <p className="font-medium">{agentMap.get(l.agent_id) ?? '—'}</p>
            )}
          </div>
          {l.sold && (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Venduto a</p>
                {buyerContact ? (
                  <Link href={`/contacts/${buyerContact.id}`} className="font-medium text-green-700 hover:underline">
                    {buyerContact.name}
                  </Link>
                ) : (
                  <p className="font-medium text-green-700">{l.sold_to_name ?? '—'}</p>
                )}
              </div>
              {l.sold_by_agent_id && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Venduto da</p>
                  {isAdmin ? (
                    <Link href={`/admin/agents/${l.sold_by_agent_id}`} className="font-medium text-green-700 hover:underline">
                      {agentMap.get(l.sold_by_agent_id) ?? '—'}
                    </Link>
                  ) : (
                    <p className="font-medium text-green-700">{agentMap.get(l.sold_by_agent_id) ?? '—'}</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      {features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Caratteristiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                  {FEATURE_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {l.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{l.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Catastral data */}
      {(l.foglio || l.particella || l.categoria_catastale) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Dati catastali
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {l.foglio && <div><p className="text-xs text-muted-foreground mb-0.5">Foglio</p><p className="font-medium">{l.foglio}</p></div>}
            {l.particella && <div><p className="text-xs text-muted-foreground mb-0.5">Particella</p><p className="font-medium">{l.particella}</p></div>}
            {l.subalterno && <div><p className="text-xs text-muted-foreground mb-0.5">Subalterno</p><p className="font-medium">{l.subalterno}</p></div>}
            {l.categoria_catastale && <div><p className="text-xs text-muted-foreground mb-0.5">Categoria</p><p className="font-medium">{l.categoria_catastale}</p></div>}
            {l.rendita_catastale && <div><p className="text-xs text-muted-foreground mb-0.5">Rendita</p><p className="font-medium">€{Number(l.rendita_catastale).toLocaleString('it-IT')}</p></div>}
          </CardContent>
        </Card>
      )}

      {/* Generated content preview */}
      {generatedContent?.listing_it && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Annuncio generato (IT)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
              {generatedContent.listing_it}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
