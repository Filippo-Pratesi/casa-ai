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

  // Use admin client to bypass RLS — user may not be a member of all group workspaces
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('role, group_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; group_id: string | null } | null

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Solo i group admin possono cambiare workspace' }, { status: 403 })
  }

  if (!profile.group_id) {
    return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
  }

  // Validate target workspace belongs to this group (admin client bypasses RLS)
  const { data: wsData } = await admin
    .from('workspaces')
    .select('id')
    .eq('id', workspace_id)
    .eq('group_id', profile.group_id)
    .single()

  if (!wsData) {
    return NextResponse.json({ error: 'Workspace non trovato nel gruppo' }, { status: 404 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspace_id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
