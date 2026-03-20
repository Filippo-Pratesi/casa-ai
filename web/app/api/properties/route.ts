import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/properties — list workspace properties with filters
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const params = req.nextUrl.searchParams
  const stage = params.get('stage')
  const zone = params.get('zone')
  const sub_zone = params.get('sub_zone')
  const agent_id = params.get('agent_id')
  const disposition = params.get('disposition')
  const transaction_type = params.get('transaction_type')
  const last_contact = params.get('last_contact') // today | week | month | over_30 | over_60
  // Sanitize search query: strip PostgREST special chars, limit to 100 chars
  const rawQ = params.get('q') ?? ''
  const q = rawQ.replace(/['"();\\]/g, '').trim().slice(0, 100) || null
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10))
  const per_page = Math.min(200, Math.max(1, parseInt(params.get('per_page') ?? '50', 10)))
  const offset = (page - 1) * per_page

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('workspace_id', profile.workspace_id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + per_page - 1)

  const cityFilter = params.get('city')
  if (stage) query = query.eq('stage', stage)
  if (cityFilter) query = query.ilike('city', `%${cityFilter}%`)
  if (zone) query = query.eq('zone', zone)
  if (sub_zone) query = query.eq('sub_zone', sub_zone)
  if (agent_id) query = query.eq('agent_id', agent_id)
  if (disposition) query = query.eq('owner_disposition', disposition)
  if (transaction_type) query = query.eq('transaction_type', transaction_type)
  if (q) {
    const search = `%${q}%`
    query = query.or(`address.ilike.${search},city.ilike.${search}`)
  }

  // last_contact filter uses updated_at as proxy for last interaction date
  if (last_contact) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
    const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
    const days30Ago = monthAgo
    const days60Ago = new Date(Date.now() - 60 * 86400_000).toISOString()

    if (last_contact === 'today') query = query.gte('updated_at', today)
    else if (last_contact === 'week') query = query.gte('updated_at', weekAgo)
    else if (last_contact === 'month') query = query.gte('updated_at', monthAgo)
    else if (last_contact === 'over_30') query = query.lt('updated_at', days30Ago)
    else if (last_contact === 'over_60') query = query.lt('updated_at', days60Ago)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero immobili' }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    per_page,
  })
}

// POST /api/properties — create new property
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const city = typeof body.city === 'string' ? body.city.trim() : ''
  const latitude = typeof body.latitude === 'number' ? body.latitude : null
  const longitude = typeof body.longitude === 'number' ? body.longitude : null
  const zone = typeof body.zone === 'string' ? body.zone.trim() || null : null

  if (!address) return NextResponse.json({ error: "L'indirizzo è obbligatorio" }, { status: 400 })
  if (!city) return NextResponse.json({ error: 'La città è obbligatoria' }, { status: 400 })
  if (!zone) return NextResponse.json({ error: 'La zona è obbligatoria' }, { status: 400 })

  // Resolve agent_id: explicit override (admin only) > zone default > current user
  let resolvedAgentId = user.id
  const explicitAgentId = typeof body.agent_id === 'string' && body.agent_id ? body.agent_id : null
  if (explicitAgentId && isAdmin) {
    resolvedAgentId = explicitAgentId
  } else {
    // Look up zone default from agent_zones by matching zone name + city
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: zoneAssignments } = await (admin as any)
      .from('agent_zones')
      .select('agent_id, zones!agent_zones_zone_id_fkey(name, city)')
      .eq('workspace_id', profile.workspace_id)
    if (zoneAssignments && zoneAssignments.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = (zoneAssignments as any[]).find((az) => {
        const z = az.zones
        if (!z) return false
        const nameMatch = zone ? z.name === zone : true
        const cityMatch = city ? z.city?.toLowerCase() === city.toLowerCase() : true
        return nameMatch && cityMatch
      })
      if (match) resolvedAgentId = match.agent_id
    }
  }

  const payload = {
    workspace_id: profile.workspace_id,
    agent_id: resolvedAgentId,
    address,
    city,
    latitude,
    longitude,
    zone,
    sub_zone: typeof body.sub_zone === 'string' ? body.sub_zone.trim() || null : null,
    doorbell: typeof body.doorbell === 'string' ? body.doorbell.trim() || null : null,
    building_notes: typeof body.building_notes === 'string' ? body.building_notes.trim() || null : null,
    transaction_type: body.transaction_type === 'affitto' ? 'affitto' : 'vendita',
    property_type: typeof body.property_type === 'string' ? body.property_type.trim() || null : null,
    sqm: typeof body.sqm === 'number' && body.sqm > 0 ? body.sqm : null,
    rooms: typeof body.rooms === 'number' && body.rooms > 0 ? body.rooms : null,
    bathrooms: typeof body.bathrooms === 'number' && body.bathrooms >= 0 ? body.bathrooms : null,
    floor: typeof body.floor === 'number' ? body.floor : null,
    total_floors: typeof body.total_floors === 'number' && body.total_floors > 0 ? body.total_floors : null,
    condition: typeof body.condition === 'string' && ['ottimo', 'buono', 'sufficiente', 'da_ristrutturare'].includes(body.condition) ? body.condition : null,
    features: Array.isArray(body.features) ? body.features : [],
    estimated_value: typeof body.estimated_value === 'number' && body.estimated_value > 0 ? body.estimated_value : null,
    stage: 'sconosciuto',
    owner_disposition: 'non_definito',
    labels: Array.isArray(body.labels) ? body.labels : [],
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('properties')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio immobile' }, { status: 500 })

  const propertyId = (data as { id: string }).id

  // Auto-event: property inserted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('property_events').insert({
    workspace_id: profile.workspace_id,
    property_id: propertyId,
    agent_id: user.id,
    event_type: 'immobile_inserito',
    title: `Immobile inserito in banca dati`,
    description: `${address}, ${city}`,
  })

  // If initial_note provided, create a property_event of type 'nota'
  const initialNote = typeof body.initial_note === 'string' ? body.initial_note.trim() : ''
  if (initialNote) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('property_events')
      .insert({
        workspace_id: profile.workspace_id,
        property_id: propertyId,
        agent_id: user.id,
        event_type: 'nota',
        title: 'Nota iniziale',
        description: initialNote,
      })
  }

  return NextResponse.json({ id: propertyId }, { status: 201 })
}
