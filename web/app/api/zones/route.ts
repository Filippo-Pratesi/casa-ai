import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getWorkspaceAndRole(userId: string) {
  const admin = createAdminClient()
  const { data } = await (admin as any)
    .from('users')
    .select('workspace_id, role')
    .eq('id', userId)
    .single()
  return data as { workspace_id: string; role: string } | null
}

function isAdmin(role: string) {
  return ['admin', 'group_admin'].includes(role)
}

// GET /api/zones — list zones with sub_zones
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const admin = createAdminClient()
  const city = req.nextUrl.searchParams.get('city')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('zones')
    .select('id, city, name, created_at, sub_zones(id, name, created_at)')
    .eq('workspace_id', userProfile.workspace_id)
    .order('city', { ascending: true })
    .order('name', { ascending: true })

  if (city) query = query.eq('city', city)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero zone' }, { status: 500 })

  return NextResponse.json({ zones: data ?? [] })
}

// POST /api/zones — create zone
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!city) return NextResponse.json({ error: 'La città è obbligatoria' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 })

  const omiZoneCode = typeof body.omi_zone_code === 'string' ? body.omi_zone_code.trim() || null : null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('zones')
    .insert({ workspace_id: userProfile.workspace_id, city, name, omi_zone_code: omiZoneCode })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Zona già esistente per questa città' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Errore nel salvataggio zona' }, { status: 500 })
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}

// PATCH /api/zones — rename zone (and update properties.zone)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
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

  const zoneId = typeof body.id === 'string' ? body.id : ''
  const newName = typeof body.new_name === 'string' ? body.new_name.trim() : ''
  const omiZoneCode = 'omi_zone_code' in body
    ? (typeof body.omi_zone_code === 'string' ? body.omi_zone_code.trim() || null : null)
    : undefined // undefined = not provided, don't update

  if (!zoneId) return NextResponse.json({ error: 'ID zona obbligatorio' }, { status: 400 })
  if (!newName && omiZoneCode === undefined) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

  const admin = createAdminClient()

  // Get old zone name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zone } = await (admin as any)
    .from('zones')
    .select('name, city')
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!zone) return NextResponse.json({ error: 'Zona non trovata' }, { status: 404 })

  const oldName = (zone as { name: string; city: string }).name
  const updatePayload: Record<string, unknown> = {}
  if (newName) updatePayload.name = newName
  if (omiZoneCode !== undefined) updatePayload.omi_zone_code = omiZoneCode

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin as any)
    .from('zones')
    .update(updatePayload)
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)

  if (updateError) return NextResponse.json({ error: 'Errore nel salvataggio zona' }, { status: 500 })

  // If name changed, update properties that reference the old zone name
  if (newName && newName !== oldName) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('properties')
      .update({ zone: newName })
      .eq('workspace_id', userProfile.workspace_id)
      .eq('zone', oldName)
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/zones?id=xxx — delete zone (only if no properties use it)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!isAdmin(userProfile.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  const zoneId = req.nextUrl.searchParams.get('id')
  if (!zoneId) return NextResponse.json({ error: 'ID zona obbligatorio' }, { status: 400 })

  const admin = createAdminClient()

  // Fetch zone name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zone } = await (admin as any)
    .from('zones')
    .select('name')
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!zone) return NextResponse.json({ error: 'Zona non trovata' }, { status: 404 })

  // Check if any properties use this zone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', userProfile.workspace_id)
    .eq('zone', (zone as { name: string }).name)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${count} immobili usano questa zona. Usa la funzione "sposta zona" prima.` },
      { status: 409 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('zones')
    .delete()
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)

  if (error) return NextResponse.json({ error: "Errore nell'eliminazione zona" }, { status: 500 })

  return NextResponse.json({ success: true })
}
