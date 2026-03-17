import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/todos/:id — toggle complete or update title
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('todos')
    .select('id, assigned_to, created_by')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Todo non trovato' }, { status: 404 })
  const t = existing as { id: string; assigned_to: string; created_by: string }
  if (t.assigned_to !== user.id && t.created_by !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.completed === 'boolean') {
    updates.completed = body.completed
    updates.completed_at = body.completed ? new Date().toISOString() : null
  }
  if (typeof body.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Errore nell\'aggiornamento' }, { status: 500 })
  return NextResponse.json({ todo: data })
}

// DELETE /api/todos/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('todos')
    .select('id, assigned_to, created_by')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Todo non trovato' }, { status: 404 })
  const t = existing as { id: string; assigned_to: string; created_by: string }
  if (t.assigned_to !== user.id && t.created_by !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('todos').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
