import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, Euro, Home, Maximize2 } from 'lucide-react'
import { redirect } from 'next/navigation'

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

export default async function MlsPage() {
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
  if (!profile) redirect('/dashboard')

  const groupId = profile.workspaces?.group_id
  if (!groupId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-foreground mb-1">MLS — Rete annunci</h1>
        <p className="text-sm text-muted-foreground">Il tuo workspace non fa parte di nessun gruppo.<br />Contatta l&apos;amministratore per abilitare la rete MLS.</p>
      </div>
    )
  }

  // Get all workspaces in the same group (excluding current)
  const { data: groupWorkspaces } = await admin
    .from('workspaces')
    .select('id, name')
    .eq('group_id', groupId)
    .neq('id', profile.workspace_id)

  const siblingIds = ((groupWorkspaces ?? []) as { id: string; name: string }[]).map(w => w.id)
  const workspaceNames = Object.fromEntries(
    ((groupWorkspaces ?? []) as { id: string; name: string }[]).map(w => [w.id, w.name])
  )

  // Get shared listings from sibling workspaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mlsListings } = siblingIds.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (admin as any)
        .from('listings')
        .select('id, address, city, price, sqm, rooms, property_type, photos_urls, workspace_id')
        .in('workspace_id', siblingIds)
        .eq('shared_with_group', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    : { data: [] }

  const listings = (mlsListings ?? []) as Array<{
    id: string; address: string; city: string; price: number
    sqm: number; rooms: number; property_type: string
    photos_urls: string[]; workspace_id: string
  }>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="animate-in-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">MLS — Rete annunci</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Annunci condivisi dalle altre agenzie del gruppo ({listings.length} immobili)
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="animate-in-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border mesh-bg p-16">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <p className="text-foreground font-semibold">Nessun immobile condiviso</p>
          <p className="text-sm text-muted-foreground mt-1">Le altre agenzie non hanno ancora condiviso annunci con la rete.</p>
        </div>
      ) : (
        <div className="animate-in-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map(l => {
            const thumb = (l.photos_urls ?? [])[0] ?? null
            return (
              <Link
                key={l.id}
                href={`/mls/${l.id}`}
                className="card-lift group rounded-2xl border border-border bg-card overflow-hidden"
              >
                {thumb ? (
                  <div className="aspect-video overflow-hidden">
                    <img src={thumb} alt={l.address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Home className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{l.address}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{PROPERTY_TYPE_LABELS[l.property_type] ?? l.property_type} · {l.city}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-foreground">€{l.price.toLocaleString('it-IT')}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{l.sqm} m²</span>
                    <span className="flex items-center gap-1"><Home className="h-3 w-3" />{l.rooms} loc.</span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium truncate">
                    <Building2 className="h-3 w-3 inline mr-1" />
                    {workspaceNames[l.workspace_id] ?? 'Altra agenzia'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
