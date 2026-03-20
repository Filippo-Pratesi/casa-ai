import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_USER_EVENT_TYPES = [
  'nota', 'telefonata', 'visita', 'citofono', 'email_inviata',
  'whatsapp_inviato', 'riunione', 'documento_caricato', 'altro',
]

interface QueuedEventPayload {
  property_id: string
  type: string
  content: string
  created_at?: string
}

// POST /api/property-events/sync — bulk create queued offline events
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  if (!profileData) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const workspaceId = (profileData as { workspace_id: string }).workspace_id

  let events: QueuedEventPayload[]
  try {
    const body = await req.json()
    if (!Array.isArray(body.events)) {
      return NextResponse.json({ error: 'Il campo events deve essere un array' }, { status: 400 })
    }
    events = body.events
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  if (events.length === 0) {
    return NextResponse.json({ synced: 0, errors: [] })
  }

  if (events.length > 100) {
    return NextResponse.json({ error: 'Massimo 100 eventi per richiesta' }, { status: 400 })
  }

  // Validate each event
  const validEvents: QueuedEventPayload[] = []
  const validationErrors: Array<{ index: number; error: string }> = []

  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    if (typeof e.property_id !== 'string' || !e.property_id) {
      validationErrors.push({ index: i, error: 'property_id mancante' })
      continue
    }
    if (typeof e.type !== 'string' || !VALID_USER_EVENT_TYPES.includes(e.type)) {
      validationErrors.push({ index: i, error: `Tipo evento non valido: ${e.type}` })
      continue
    }
    if (typeof e.content !== 'string' || !e.content.trim()) {
      validationErrors.push({ index: i, error: 'content mancante' })
      continue
    }
    validEvents.push(e)
  }

  if (validEvents.length === 0) {
    return NextResponse.json({ synced: 0, errors: validationErrors })
  }

  // Verify all property IDs belong to this workspace
  const propertyIds = [...new Set(validEvents.map(e => e.property_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: props } = await (admin as any)
    .from('properties')
    .select('id')
    .in('id', propertyIds)
    .eq('workspace_id', workspaceId)

  const validPropertyIds = new Set(((props ?? []) as Array<{ id: string }>).map(p => p.id))

  const payloads = validEvents
    .filter(e => validPropertyIds.has(e.property_id))
    .map(e => ({
      workspace_id: workspaceId,
      property_id: e.property_id,
      agent_id: user.id,
      event_type: e.type,
      title: e.content.trim(),
      description: null,
      contact_id: null,
      sentiment: null,
      // Use the offline timestamp as event_date if valid, otherwise now
      event_date: e.created_at && !isNaN(new Date(e.created_at).getTime())
        ? new Date(e.created_at).toISOString()
        : new Date().toISOString(),
    }))

  if (payloads.length === 0) {
    return NextResponse.json({ synced: 0, errors: validationErrors })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('property_events')
    .insert(payloads)

  if (error) {
    return NextResponse.json({ error: 'Errore nel salvataggio degli eventi' }, { status: 500 })
  }

  return NextResponse.json({ synced: payloads.length, errors: validationErrors })
}
