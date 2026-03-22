import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/supabase/active-workspace'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { workspace_id } = await req.json()
  if (!workspace_id) return NextResponse.json({ error: 'workspace_id richiesto' }, { status: 400 })

  const admin = createAdminClient()

  // Use admin client to bypass RLS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('role, group_id, workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; group_id: string | null; workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 400 })

  if (profile.role === 'group_admin') {
    // group_admin: validate target workspace belongs to their group
    if (!profile.group_id) {
      return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
    }
    const { data: wsData } = await admin
      .from('workspaces')
      .select('id')
      .eq('id', workspace_id)
      .eq('group_id', profile.group_id)
      .single()
    if (!wsData) {
      return NextResponse.json({ error: 'Workspace non trovato nel gruppo' }, { status: 404 })
    }
  } else {
    // Regular user: can switch to their primary workspace or any workspace they have via workspace_members
    if (workspace_id !== profile.workspace_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: memberData } = await (admin as any)
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('workspace_id', workspace_id)
        .single()
      if (!memberData) {
        return NextResponse.json({ error: 'Non hai accesso a questo workspace' }, { status: 403 })
      }
    }
  }

  // Update user's active workspace in the database — this is the source of truth.
  // All pages/API routes read profile.workspace_id, so updating it here fixes
  // data isolation across all 100+ routes without touching them individually.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('users')
    .update({ workspace_id })
    .eq('id', user.id)

  const res = NextResponse.json({ success: true })
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspace_id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
