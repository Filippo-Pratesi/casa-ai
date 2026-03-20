import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_USER_EVENT_TYPES = [
  'nota', 'telefonata', 'visita', 'citofono', 'email_inviata',
  'whatsapp_inviato', 'riunione', 'documento_caricato', 'altro',
]

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// GET /api/properties/[id]/events — paginated events list
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const per_page = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10)))
  const event_type = searchParams.get('event_type')
  const offset = (page - 1) * per_page

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('property_events')
    .select(
      `*, agent:agent_id(id, name)`,
      { count: 'exact' }
    )
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)
    .order('event_date', { ascending: false })
    .range(offset, offset + per_page - 1)

  if (event_type) query = query.eq('event_type', event_type)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero eventi' }, { status: 500 })

  return NextResponse.json({ events: data ?? [], total: count ?? 0 })
}

// POST /api/properties/[id]/events — create new event
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const eventType = typeof body.event_type === 'string' ? body.event_type : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (!VALID_USER_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Tipo evento non valido' }, { status: 400 })
  }
  if (!title) return NextResponse.json({ error: 'Il titolo è obbligatorio' }, { status: 400 })

  // Verify property belongs to workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prop } = await (supabase as any)
    .from('properties')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!prop) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  const validSentiments = ['positive', 'neutral', 'negative']
  const sentiment = typeof body.sentiment === 'string' && validSentiments.includes(body.sentiment)
    ? body.sentiment
    : null

  const payload = {
    workspace_id: workspaceId,
    property_id: id,
    agent_id: user.id,
    event_type: eventType,
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    contact_id: typeof body.contact_id === 'string' ? body.contact_id || null : null,
    sentiment,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('property_events')
    .insert(payload)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: "Errore nel salvataggio dell'evento" }, { status: 500 })

  return NextResponse.json({ event: data }, { status: 201 })
}
