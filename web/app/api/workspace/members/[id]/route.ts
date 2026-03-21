import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/workspace/members/[id] — remove a member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (targetId === user.id) {
    return NextResponse.json({ error: 'Non puoi rimuovere te stesso' }, { status: 400 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch target user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', targetId)
    .single()

  if (!target || target.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  // Admin can only remove agents; group_admin can remove agents and admins
  if (target.role === 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Solo un admin di gruppo può rimuovere un admin' }, { status: 403 })
  }
  if (target.role === 'group_admin') {
    return NextResponse.json({ error: 'Non puoi rimuovere un admin di gruppo' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('users').delete().eq('id', targetId)
  if (error) {
    console.error('Delete member error:', error)
    return NextResponse.json({ error: 'Errore durante la rimozione' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Membro rimosso' })
}

// PATCH /api/workspace/members/[id] — update member (name, email by any admin; role by group_admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const { role, name, email } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: target } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', targetId)
    .single()

  if (!target || target.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  if (target.role === 'group_admin') {
    return NextResponse.json({ error: 'Non puoi modificare un admin di gruppo' }, { status: 403 })
  }

  // Role changes: any admin can change an agent's role; only group_admin can change another admin's role
  if (role !== undefined && target.role === 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Solo un admin di gruppo può modificare il ruolo di un admin' }, { status: 403 })
  }
  if (role !== undefined && !['admin', 'agent'].includes(role)) {
    return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
  }

  // Build update payload
  const updates: Record<string, string> = {}
  if (role !== undefined) updates.role = role
  if (typeof name === 'string' && name.trim()) updates.name = name.trim()
  if (typeof email === 'string' && email.trim()) updates.email = email.trim().toLowerCase()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('users').update(updates).eq('id', targetId)
  if (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento' }, { status: 500 })
  }

  return NextResponse.json({ message: 'Membro aggiornato' })
}
