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

function isAdmin(role: string) {
  return ['admin', 'group_admin'].includes(role)
}

// GET /api/zones/sub-zones?zone_id=xxx — list sub-zones for a zone
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const zoneId = req.nextUrl.searchParams.get('zone_id')
  if (!zoneId) return NextResponse.json({ error: 'zone_id obbligatorio' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sub_zones')
    .select('id, name, zone_id, created_at')
    .eq('zone_id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: 'Errore nel recupero sotto-zone' }, { status: 500 })

  return NextResponse.json({ sub_zones: data ?? [] })
}

// POST /api/zones/sub-zones — create sub-zone
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const zoneId = typeof body.zone_id === 'string' ? body.zone_id : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!zoneId) return NextResponse.json({ error: 'zone_id obbligatorio' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 })

  // Verify parent zone belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: parentZone } = await (supabase as any)
    .from('zones')
    .select('id')
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!parentZone) return NextResponse.json({ error: 'Zona non trovata' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('sub_zones')
    .insert({ workspace_id: userProfile.workspace_id, zone_id: zoneId, name })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Sotto-zona già esistente in questa zona' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Errore nel salvataggio sotto-zona' }, { status: 500 })
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}

// PATCH /api/zones/sub-zones — rename sub-zone
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!isAdmin(userProfile.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const subZoneId = typeof body.id === 'string' ? body.id : ''
  const newName = typeof body.new_name === 'string' ? body.new_name.trim() : ''

  if (!subZoneId) return NextResponse.json({ error: 'ID sotto-zona obbligatorio' }, { status: 400 })
  if (!newName) return NextResponse.json({ error: 'Il nuovo nome è obbligatorio' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('sub_zones')
    .select('name')
    .eq('id', subZoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Sotto-zona non trovata' }, { status: 404 })

  const oldName = (existing as { name: string }).name

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('sub_zones')
    .update({ name: newName })
    .eq('id', subZoneId)
    .eq('workspace_id', userProfile.workspace_id)

  if (updateError) return NextResponse.json({ error: 'Errore nel rinomino sotto-zona' }, { status: 500 })

  // Update properties that reference the old sub_zone name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('properties')
    .update({ sub_zone: newName })
    .eq('workspace_id', userProfile.workspace_id)
    .eq('sub_zone', oldName)

  return NextResponse.json({ success: true })
}

// DELETE /api/zones/sub-zones?id=xxx — delete sub-zone
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(supabase, user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!isAdmin(userProfile.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  const subZoneId = req.nextUrl.searchParams.get('id')
  if (!subZoneId) return NextResponse.json({ error: 'ID sotto-zona obbligatorio' }, { status: 400 })

  // Verify sub-zone belongs to workspace and get its name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subZone } = await (supabase as any)
    .from('sub_zones')
    .select('name')
    .eq('id', subZoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!subZone) return NextResponse.json({ error: 'Sotto-zona non trovata' }, { status: 404 })

  // Check if any properties reference this sub_zone by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: propertyCount } = await (supabase as any)
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', userProfile.workspace_id)
    .eq('sub_zone', (subZone as { name: string }).name)

  if ((propertyCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${propertyCount} immobil${propertyCount === 1 ? 'e usa' : 'i usano'} questa sotto-zona`, property_count: propertyCount },
      { status: 409 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('sub_zones')
    .delete()
    .eq('id', subZoneId)
    .eq('workspace_id', userProfile.workspace_id)

  if (error) return NextResponse.json({ error: "Errore nell'eliminazione sotto-zona" }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
