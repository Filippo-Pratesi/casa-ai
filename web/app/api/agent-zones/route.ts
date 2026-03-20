import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getWorkspaceAndRole(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', userId)
    .single()
  return data as { workspace_id: string; role: string } | null
}

function isAdmin(role: string) {
  return ['admin', 'group_admin'].includes(role)
}

// GET /api/agent-zones — list zone assignments for workspace (or filter by agent_id)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const admin = createAdminClient()
  const agentId = req.nextUrl.searchParams.get('agent_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('agent_zones')
    .select(`
      id, agent_id, zone_id, created_at,
      zones(id, name, city),
      agent:agent_id(id, name, email)
    `)
    .eq('workspace_id', userProfile.workspace_id)
    .order('created_at', { ascending: true })

  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero assegnazioni zone' }, { status: 500 })

  return NextResponse.json({ assignments: data ?? [] })
}

// POST /api/agent-zones — assign zone to agent (admins only)
export async function POST(req: NextRequest) {
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

  const agentId = typeof body.agent_id === 'string' ? body.agent_id : ''
  const zoneId = typeof body.zone_id === 'string' ? body.zone_id : ''
  const subZoneId = typeof body.sub_zone_id === 'string' ? body.sub_zone_id : null

  if (!agentId) return NextResponse.json({ error: 'agent_id obbligatorio' }, { status: 400 })
  if (!zoneId) return NextResponse.json({ error: 'zone_id obbligatorio' }, { status: 400 })

  const admin = createAdminClient()

  // Verify agent belongs to workspace
  const { data: agentData } = await admin
    .from('users')
    .select('id')
    .eq('id', agentId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!agentData) return NextResponse.json({ error: 'Agente non trovato nel workspace' }, { status: 404 })

  // Verify zone belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zoneData } = await (admin as any)
    .from('zones')
    .select('id')
    .eq('id', zoneId)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (!zoneData) return NextResponse.json({ error: 'Zona non trovata' }, { status: 404 })

  // If sub_zone_id provided, verify it belongs to the given zone in this workspace
  if (subZoneId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subZoneData } = await (admin as any)
      .from('sub_zones')
      .select('id')
      .eq('id', subZoneId)
      .eq('zone_id', zoneId)
      .eq('workspace_id', userProfile.workspace_id)
      .single()
    if (!subZoneData) return NextResponse.json({ error: 'Sotto-zona non trovata' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_zones')
    .insert({ workspace_id: userProfile.workspace_id, agent_id: agentId, zone_id: zoneId, sub_zone_id: subZoneId })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Agente già assegnato a questa zona' }, { status: 409 })
    }
    return NextResponse.json({ error: "Errore nell'assegnazione zona" }, { status: 500 })
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}

// DELETE /api/agent-zones?id=xxx — remove assignment (admins only)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const userProfile = await getWorkspaceAndRole(user.id)
  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!isAdmin(userProfile.role)) {
    return NextResponse.json({ error: 'Permessi insufficienti' }, { status: 403 })
  }

  const admin = createAdminClient()
  const assignmentId = req.nextUrl.searchParams.get('id')
  if (!assignmentId) return NextResponse.json({ error: 'ID assegnazione obbligatorio' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('agent_zones')
    .delete()
    .eq('id', assignmentId)
    .eq('workspace_id', userProfile.workspace_id)

  if (error) return NextResponse.json({ error: "Errore nella rimozione assegnazione" }, { status: 500 })

  return NextResponse.json({ success: true })
}
