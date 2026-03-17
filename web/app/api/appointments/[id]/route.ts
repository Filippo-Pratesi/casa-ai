import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const { error } = await (admin as any)
    .from('appointments')
    .update(allowed)
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: 'Errore nella cancellazione' }, { status: 500 })

  return NextResponse.json({ success: true })
}
