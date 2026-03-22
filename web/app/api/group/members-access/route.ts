import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ProfileRow = { role: string; group_id: string | null }

async function getProfile(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<ProfileRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any).from('users').select('role, group_id').eq('id', userId).single()
  return data as ProfileRow | null
}

// GET - List all users in the group with their workspace memberships
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const profile = await getProfile(admin, user.id)

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }
  if (!profile.group_id) {
    return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
  }

  // Get all workspaces in this group
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, name')
    .eq('group_id', profile.group_id)
    .order('name')

  // Get all workspace_members for these workspaces
  const workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id)
  if (workspaceIds.length === 0) return NextResponse.json({ members: [], workspaces: [] })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memberships } = await (admin as any)
    .from('workspace_members')
    .select('user_id, workspace_id, role, is_default, joined_at')
    .in('workspace_id', workspaceIds)

  // Get all user profiles for these members
  const userIds = [...new Set(((memberships ?? []) as { user_id: string }[]).map((m) => m.user_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (admin as any)
    .from('users')
    .select('id, name, email, role')
    .in('id', userIds)

  return NextResponse.json({ memberships: memberships ?? [], profiles: profiles ?? [], workspaces: workspaces ?? [] })
}

// POST - Add a user to a workspace within the group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const profile = await getProfile(admin, user.id)

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }

  const { user_id, workspace_id, role } = await req.json()
  if (!user_id || !workspace_id || !role) {
    return NextResponse.json({ error: 'user_id, workspace_id e role sono richiesti' }, { status: 400 })
  }

  // Verify workspace belongs to this group
  const { data: ws } = await admin
    .from('workspaces')
    .select('id')
    .eq('id', workspace_id)
    .eq('group_id', profile.group_id!)
    .single()
  if (!ws) return NextResponse.json({ error: 'Workspace non nel gruppo' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('workspace_members')
    .upsert({ user_id, workspace_id, role }, { onConflict: 'user_id,workspace_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE - Remove a user from a workspace
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const profile = await getProfile(admin, user.id)

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }

  const { user_id, workspace_id } = await req.json()
  if (!user_id || !workspace_id) {
    return NextResponse.json({ error: 'user_id e workspace_id richiesti' }, { status: 400 })
  }

  // Verify workspace belongs to this group
  const { data: ws } = await admin
    .from('workspaces')
    .select('id')
    .eq('id', workspace_id)
    .eq('group_id', profile.group_id!)
    .single()
  if (!ws) return NextResponse.json({ error: 'Workspace non nel gruppo' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('workspace_members')
    .delete()
    .eq('user_id', user_id)
    .eq('workspace_id', workspace_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
