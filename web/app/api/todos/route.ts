import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/todos — list todos assigned to or created by the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('todos')
    .select('id, title, completed, completed_at, created_at, created_by, assigned_to, workspace_id')
    .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Errore nel recupero todo' }, { status: 500 })
  return NextResponse.json({ todos: data ?? [] })
}

// POST /api/todos — create a todo
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { title, assigned_to } = body as { title: string; assigned_to?: string }

  if (!title?.trim()) return NextResponse.json({ error: 'Il titolo è obbligatorio' }, { status: 400 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, name')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; name: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const assignee = assigned_to ?? user.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('todos')
    .insert({
      workspace_id: profile.workspace_id,
      created_by: user.id,
      assigned_to: assignee,
      title: title.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Errore nella creazione todo' }, { status: 500 })

  // If assigning to someone else, create a notification for them
  if (assignee !== user.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('notifications')
      .insert({
        workspace_id: profile.workspace_id,
        agent_id: assignee,
        type: 'todo_assigned',
        title: `Nuovo todo da ${profile.name}`,
        body: title.trim(),
      })
  }

  return NextResponse.json({ todo: data }, { status: 201 })
}
