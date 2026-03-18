import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getWorkspaceAndRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('workspace_id, role')
    .eq('id', userId)
    .single()
  return data as { workspace_id: string; role: string } | null
}

// POST /api/zones/replace — move all properties from source zone to target, then delete source
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!['admin', 'group_admin'].includes(userProfile.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const sourceZoneId = typeof body.source_zone_id === 'string' ? body.source_zone_id : ''
  const targetZoneId = typeof body.target_zone_id === 'string' ? body.target_zone_id : ''

  if (!sourceZoneId) return NextResponse.json({ error: 'source_zone_id obbligatorio' }, { status: 400 })
  if (!targetZoneId) return NextResponse.json({ error: 'target_zone_id obbligatorio' }, { status: 400 })
  if (sourceZoneId === targetZoneId) {
    return NextResponse.json({ error: 'Zona sorgente e destinazione devono essere diverse' }, { status: 400 })
  }

  // Fetch both zones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sourceZone } = await (supabase as any)
    .from('zones')
    .select('id, name, city')
    .eq('id', sourceZoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!sourceZone) return NextResponse.json({ error: 'Zona sorgente non trovata' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: targetZone } = await (supabase as any)
    .from('zones')
    .select('id, name')
    .eq('id', targetZoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!targetZone) return NextResponse.json({ error: 'Zona destinazione non trovata' }, { status: 404 })

  const sourceName = (sourceZone as { name: string }).name
  const targetName = (targetZone as { name: string }).name

  // Update all properties from source zone to target zone name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: movedCount, error: moveError } = await (supabase as any)
    .from('properties')
    .update({ zone: targetName })
    .eq('workspace_id', userProfile.workspace_id)
    .eq('zone', sourceName)
    .select('id', { count: 'exact' })

  if (moveError) {
    return NextResponse.json({ error: 'Errore nello spostamento degli immobili' }, { status: 500 })
  }

  // Delete source zone (cascade deletes sub_zones and agent_zones)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase as any)
    .from('zones')
    .delete()
    .eq('id', sourceZoneId)
    .eq('workspace_id', userProfile.workspace_id)

  if (deleteError) {
    return NextResponse.json({ error: "Errore nell'eliminazione zona sorgente" }, { status: 500 })
  }

  return NextResponse.json({ moved_count: movedCount ?? 0 })
}
