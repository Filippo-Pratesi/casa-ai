import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ProfileRow = { role: string; group_id: string | null; workspace_id?: string }

async function getProfile(admin: ReturnType<typeof createAdminClient>, userId: string, fields: string): Promise<ProfileRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any).from('users').select(fields).eq('id', userId).single()
  return data as ProfileRow | null
}

// GET - List all contact sharing settings for the group
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const profile = await getProfile(admin, user.id, 'role, group_id')

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }
  if (!profile.group_id) {
    return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sharing } = await (admin as any)
    .from('group_contact_sharing')
    .select('*')
    .eq('group_id', profile.group_id)

  return NextResponse.json({ sharing: sharing ?? [] })
}

// PATCH - Enable or disable contact sharing for a workspace pair
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const profile = await getProfile(admin, user.id, 'role, group_id, workspace_id')

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }
  if (!profile.group_id) {
    return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
  }

  const { workspace_a_id, workspace_b_id, enabled } = await req.json()
  if (!workspace_a_id || !workspace_b_id || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'workspace_a_id, workspace_b_id e enabled richiesti' }, { status: 400 })
  }

  // Enforce the CHECK constraint: workspace_a_id < workspace_b_id
  const [a, b] = [workspace_a_id, workspace_b_id].sort()

  // Verify both workspaces belong to this group
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id')
    .eq('group_id', profile.group_id)
    .in('id', [a, b])

  if (!workspaces || workspaces.length < 2) {
    return NextResponse.json({ error: 'Uno o entrambi i workspace non appartengono al gruppo' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('group_contact_sharing')
    .upsert(
      {
        group_id: profile.group_id,
        workspace_a_id: a,
        workspace_b_id: b,
        enabled,
        enabled_by: enabled ? user.id : null,
        enabled_at: enabled ? new Date().toISOString() : null,
      },
      { onConflict: 'group_id,workspace_a_id,workspace_b_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
