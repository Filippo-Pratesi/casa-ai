import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pushAppointmentToGoogle } from '@/lib/google-calendar'

// GET /api/appointments — list appointments for user (or all if admin)
export async function GET(req: NextRequest) {
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

  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  const agentIdFilter = req.nextUrl.searchParams.get('agent_id')

  // Use admin client to bypass RLS — workspace_id filter ensures security
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('appointments')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('starts_at', { ascending: true })

  // Non-admins only see their own; admins can filter by agent_id
  if (profile.role === 'agent') {
    query = query.eq('agent_id', user.id)
  } else if (agentIdFilter) {
    query = query.eq('agent_id', agentIdFilter)
  }

  if (from) query = query.gte('starts_at', from)
  if (to) query = query.lte('starts_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero appuntamenti' }, { status: 500 })

  return NextResponse.json({ appointments: data ?? [] })
}

// POST /api/appointments — create appointment
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })

  const validTypes = ['viewing', 'meeting', 'signing', 'call', 'other', 'visita', 'riunione', 'atto', 'acquisizione', 'altro']
  const type = typeof body.type === 'string' && validTypes.includes(body.type) ? body.type : 'meeting'

  if (!body.starts_at) return NextResponse.json({ error: 'Data obbligatoria' }, { status: 400 })
  if (isNaN(new Date(String(body.starts_at)).getTime())) {
    return NextResponse.json({ error: 'Formato data inizio non valido' }, { status: 400 })
  }
  if (body.ends_at && isNaN(new Date(String(body.ends_at)).getTime())) {
    return NextResponse.json({ error: 'Formato data fine non valido' }, { status: 400 })
  }

  // Admins may create appointments on behalf of other agents
  let targetAgentId = user.id
  if (profile.role !== 'agent' && typeof body.agent_id === 'string' && body.agent_id) {
    targetAgentId = body.agent_id
  }

  const payload = {
    workspace_id: profile.workspace_id,
    agent_id: targetAgentId,
    type,
    title,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    starts_at: body.starts_at,
    ends_at: body.ends_at ?? null,
    listing_id: typeof body.listing_id === 'string' ? body.listing_id : null,
    contact_id: typeof body.contact_id === 'string' ? body.contact_id : null,
    contact_name: typeof body.contact_name === 'string' ? body.contact_name.trim() || null : null,
    status: 'scheduled',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('appointments')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  const newId = (data as { id: string }).id

  // Notify agent if appointment was created by a different user (admin assigned it)
  if (targetAgentId !== user.id) {
    const startsAtLabel = new Date(String(body.starts_at)).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('notifications').insert({
      workspace_id: profile.workspace_id,
      agent_id: targetAgentId,
      type: 'appointment_assigned',
      title: 'Nuovo appuntamento assegnato',
      body: `${title} — ${startsAtLabel}`,
      read: false,
    })
  }

  // Push to Google Calendar if agent has tokens (fire-and-forget)
  pushAppointmentToGoogle(
    { title, starts_at: String(body.starts_at), ends_at: body.ends_at ? String(body.ends_at) : null, notes: payload.notes },
    targetAgentId
  ).then(async (googleEventId) => {
    if (googleEventId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('appointments').update({ google_event_id: googleEventId }).eq('id', newId)
    }
  }).catch(() => { /* silent — Google Calendar is optional */ })

  return NextResponse.json({ id: newId }, { status: 201 })
}
