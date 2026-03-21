import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/workspace/members/[id]/reassign-and-remove
// Body: { target_agent_id: string }
// Reassigns all active work from the source agent to the target agent, then removes the source.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sourceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  if (sourceId === user.id) {
    return NextResponse.json({ error: 'Non puoi rimuovere te stesso' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profile } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const body = await req.json() as { target_agent_id?: string }
  const { target_agent_id } = body
  if (!target_agent_id) {
    return NextResponse.json({ error: 'target_agent_id è obbligatorio' }, { status: 400 })
  }
  if (target_agent_id === sourceId) {
    return NextResponse.json({ error: 'Agente di destinazione uguale a quello di origine' }, { status: 400 })
  }

  const ws = profile.workspace_id

  // Verify source belongs to same workspace and can be removed
  const { data: source } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', sourceId)
    .single()

  if (!source || source.workspace_id !== ws) {
    return NextResponse.json({ error: 'Agente non trovato' }, { status: 404 })
  }
  if (source.role === 'group_admin') {
    return NextResponse.json({ error: 'Non puoi rimuovere un admin di gruppo' }, { status: 403 })
  }
  if (source.role === 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Solo un admin di gruppo può rimuovere un admin' }, { status: 403 })
  }

  // Verify target belongs to same workspace
  const { data: targetAgent } = await admin
    .from('users')
    .select('id, workspace_id')
    .eq('id', target_agent_id)
    .single()

  if (!targetAgent || targetAgent.workspace_id !== ws) {
    return NextResponse.json({ error: 'Agente destinatario non trovato' }, { status: 404 })
  }

  // ── Reassign all work items ─────────────────────────────────────────────────
  const reassignments: Promise<unknown>[] = [
    admin.from('properties').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    admin.from('contacts').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    admin.from('listings').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    admin.from('appointments').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    admin.from('proposals').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    admin.from('invoices').update({ agent_id: target_agent_id }).eq('workspace_id', ws).eq('agent_id', sourceId),
    // Todos: reassign open tasks assigned to source
    admin.from('todos').update({ assigned_to: target_agent_id }).eq('workspace_id', ws).eq('assigned_to', sourceId).eq('completed', false),
  ]

  await Promise.all(reassignments)

  // ── Remove the agent ────────────────────────────────────────────────────────
  const { error: deleteError } = await admin.from('users').delete().eq('id', sourceId)
  if (deleteError) {
    console.error('Delete member error:', deleteError)
    return NextResponse.json({ error: 'Errore durante la rimozione dell\'agente' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
