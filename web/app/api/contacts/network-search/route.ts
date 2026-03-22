import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRaw } = await (admin as any)
    .from('users')
    .select('workspace_id, group_id')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { workspace_id: string; group_id: string | null } | null
  if (!profile?.workspace_id) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 400 })
  }

  // Find all workspaces with active sharing with the current workspace
  const myWs = profile.workspace_id
  const { data: sharingRows } = await admin
    .from('group_contact_sharing')
    .select('workspace_a_id, workspace_b_id')
    .eq('enabled', true)
    .or(`workspace_a_id.eq.${myWs},workspace_b_id.eq.${myWs}`)

  const sharedWorkspaceIds = (sharingRows ?? [])
    .map((row: { workspace_a_id: string; workspace_b_id: string }) =>
      row.workspace_a_id === myWs ? row.workspace_b_id : row.workspace_a_id
    )
    .filter(Boolean)

  if (sharedWorkspaceIds.length === 0) {
    return NextResponse.json({ contacts: [], workspaces: [] })
  }

  // Parse query params
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const contactType = searchParams.get('type') ?? ''
  const budgetMin = searchParams.get('budget_min') ? Number(searchParams.get('budget_min')) : null
  const budgetMax = searchParams.get('budget_max') ? Number(searchParams.get('budget_max')) : null

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('contacts')
    .select('id, name, email, phone, types, type, budget_min, budget_max, workspace_id, created_at')
    .in('workspace_id', sharedWorkspaceIds)
    .limit(50)

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (contactType) {
    query = query.contains('types', [contactType])
  }
  if (budgetMin !== null) {
    query = query.gte('budget_max', budgetMin)
  }
  if (budgetMax !== null) {
    query = query.lte('budget_min', budgetMax)
  }

  query = query.order('name', { ascending: true })

  const { data: contacts, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch workspace names for the results
  const wsIds = [...new Set((contacts ?? []).map((c: { workspace_id: string }) => c.workspace_id))]
  const { data: workspacesData } = await admin
    .from('workspaces')
    .select('id, name')
    .in('id', wsIds)

  return NextResponse.json({ contacts: contacts ?? [], workspaces: workspacesData ?? [] })
}
