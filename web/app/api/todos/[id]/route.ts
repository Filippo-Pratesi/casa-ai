import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  let body: { completed?: boolean; title?: string; notes?: string; priority?: string; due_date?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Ownership check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('todos')
    .select('id, assigned_to, created_by')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (existing.assigned_to !== user.id && existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.completed === 'boolean') {
    updates.completed = body.completed
    updates.completed_at = body.completed ? new Date().toISOString() : null
  }
  if (typeof body.title === 'string') updates.title = body.title.trim()
  if (typeof body.notes !== 'undefined') updates.notes = body.notes || null
  if (typeof body.priority === 'string') updates.priority = body.priority
  if ('due_date' in body) updates.due_date = body.due_date || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todo, error } = await (admin as any)
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Todo update error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ todo })
}

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
  const { data: existing } = await (admin as any)
    .from('todos')
    .select('id, assigned_to, created_by')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (existing.assigned_to !== user.id && existing.created_by !== user.id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('todos').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
