import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/workspace/members/[id]/workload
// Returns counts of active items assigned to the given agent.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

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

  // Verify target belongs to same workspace
  const { data: target } = await admin
    .from('users')
    .select('id, workspace_id, name')
    .eq('id', targetId)
    .single()

  if (!target || target.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }

  const ws = profile.workspace_id

  const [
    propertiesRes,
    contactsRes,
    listingsRes,
    appointmentsRes,
    todosRes,
    proposalsRes,
    invoicesRes,
  ] = await Promise.all([
    admin.from('properties').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
    admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
    admin.from('appointments').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
    admin.from('todos').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('assigned_to', targetId).eq('completed', false),
    admin.from('proposals').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
    admin.from('invoices').select('id', { count: 'exact', head: true }).eq('workspace_id', ws).eq('agent_id', targetId),
  ])

  return NextResponse.json({
    agentName: target.name,
    counts: {
      properties:   propertiesRes.count  ?? 0,
      contacts:     contactsRes.count    ?? 0,
      listings:     listingsRes.count    ?? 0,
      appointments: appointmentsRes.count ?? 0,
      todos:        todosRes.count       ?? 0,
      proposals:    proposalsRes.count   ?? 0,
      invoices:     invoicesRes.count    ?? 0,
    },
  })
}
