import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar'

// PATCH /api/appointments/[id] — update status or fields
export async function PATCH(
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

  const validTypes = ['viewing', 'meeting', 'signing', 'call', 'other']
  const validStatuses = ['scheduled', 'completed', 'cancelled']
  const allowed: Record<string, unknown> = {}

  if (typeof body.title === 'string' && body.title.trim()) allowed.title = body.title.trim()
  if (typeof body.type === 'string' && validTypes.includes(body.type)) allowed.type = body.type
  if (typeof body.status === 'string' && validStatuses.includes(body.status)) allowed.status = body.status
  if ('notes' in body) allowed.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  if (body.starts_at) allowed.starts_at = body.starts_at
  if ('ends_at' in body) allowed.ends_at = body.ends_at ?? null
  if ('contact_name' in body) allowed.contact_name = typeof body.contact_name === 'string' ? body.contact_name.trim() || null : null

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (admin as any)
    .from('appointments')
    .update(allowed)
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id) // security: prevent cross-workspace modification
    .select('google_event_id, agent_id, title, starts_at, ends_at, notes')
    .single()

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  // Sync to Google Calendar if event exists
  const upd = updated as { google_event_id: string | null; agent_id: string; title: string; starts_at: string; ends_at: string | null; notes: string | null } | null
  if (upd?.google_event_id && (allowed.title || allowed.starts_at || allowed.ends_at || allowed.notes !== undefined)) {
    updateGoogleEvent(upd.google_event_id, { title: upd.title, starts_at: upd.starts_at, ends_at: upd.ends_at, notes: upd.notes }, upd.agent_id)
      .catch(() => { /* silent */ })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/appointments/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Fetch before delete to get google_event_id — and verify workspace ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('appointments')
    .select('google_event_id, agent_id, workspace_id')
    .eq('id', id)
    .single()

  const ex = existing as { google_event_id: string | null; agent_id: string; workspace_id: string } | null
  if (!ex || ex.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id) // double security check

  if (error) return NextResponse.json({ error: 'Errore nella cancellazione' }, { status: 500 })

  // Delete from Google Calendar if linked
  if (ex.google_event_id) {
    deleteGoogleEvent(ex.google_event_id, ex.agent_id).catch(() => { /* silent */ })
  }

  return NextResponse.json({ success: true })
}
