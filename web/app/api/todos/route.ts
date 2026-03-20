import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('todos')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Todos fetch error:', error)
    return NextResponse.json({ error: 'Errore nel recupero' }, { status: 500 })
  }

  return NextResponse.json({ todos: data ?? [] })
}

export async function POST(req: NextRequest) {
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: { title: string; assigned_to?: string; notes?: string; priority?: string; due_date?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const { title, assigned_to, notes, priority, due_date } = body
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })
  }

  const VALID_PRIORITIES = ['low', 'medium', 'high']
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: `Priorità non valida. Valori consentiti: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
  }
  if (due_date && isNaN(new Date(due_date).getTime())) {
    return NextResponse.json({ error: 'Formato data scadenza non valido' }, { status: 400 })
  }

  const assignedTo = assigned_to || user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todo, error } = await (admin as any)
    .from('todos')
    .insert({
      workspace_id: profile.workspace_id,
      created_by: user.id,
      assigned_to: assignedTo,
      title: title.trim(),
      notes: notes || null,
      priority: priority || 'medium',
      due_date: due_date || null,
      completed: false,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Todo insert error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  // Send notification if assigned to someone else
  if (assignedTo !== user.id) {
    const { data: senderData } = await admin
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()
    const senderName = (senderData as { name: string } | null)?.name ?? 'Un collega'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('notifications')
      .insert({
        workspace_id: profile.workspace_id,
        agent_id: assignedTo,
        type: 'todo_assigned',
        title: 'Nuovo To Do assegnato',
        body: `${senderName} ti ha assegnato: "${title.trim()}"`,
        read: false,
      })
  }

  return NextResponse.json({ todo }, { status: 201 })
}
