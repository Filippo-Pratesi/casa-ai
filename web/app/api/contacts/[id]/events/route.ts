import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/contacts/[id]/events — list contact events with pagination
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile?.workspace_id) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Verify contact belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactData } = await (admin as any)
    .from('contacts')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!contactData) return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })

  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10))
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('contact_events')
    .select(`
      id, event_type, title, body, event_date, created_at,
      agent:users!contact_events_agent_id_fkey(name),
      related_property_id, related_listing_id
    `)
    .eq('contact_id', id)
    .eq('workspace_id', profile.workspace_id)
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: 'Errore nel recupero eventi' }, { status: 500 })

  // Normalize agent name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (data ?? []).map((e: any) => ({
    ...e,
    agent_name: e.agent?.name ?? null,
    agent: undefined,
  }))

  return NextResponse.json({ events })
}

// POST /api/contacts/[id]/events — create contact event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile?.workspace_id) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Verify contact belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactData } = await (admin as any)
    .from('contacts')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!contactData) return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const validTypes = ['nota', 'chiamata', 'email', 'appuntamento', 'campagna_inviata', 'immobile_proposto']
  const event_type = typeof body.event_type === 'string' && validTypes.includes(body.event_type)
    ? body.event_type
    : 'nota'
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'Il titolo è obbligatorio' }, { status: 400 })

  const payload = {
    workspace_id: profile.workspace_id,
    contact_id: id,
    agent_id: user.id,
    event_type,
    title,
    body: typeof body.body === 'string' ? body.body.trim() || null : null,
    related_property_id: typeof body.related_property_id === 'string' ? body.related_property_id : null,
    related_listing_id: typeof body.related_listing_id === 'string' ? body.related_listing_id : null,
    event_date: typeof body.event_date === 'string' ? body.event_date : new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventData, error } = await (admin as any)
    .from('contact_events')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio evento' }, { status: 500 })

  return NextResponse.json({ id: (eventData as { id: string }).id }, { status: 201 })
}
