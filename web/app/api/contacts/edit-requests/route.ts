import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - List pending edit requests for the current user's workspace (admin) or sent by current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRaw } = await (admin as any)
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { workspace_id: string; role: string } | null
  if (!profile?.workspace_id) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 400 })
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('contact_edit_requests')
    .select(`
      id, contact_id, changes, note, status, rejection_reason, created_at, reviewed_at,
      owner_workspace_id, requester_id, requester_workspace_id,
      contact:contacts!contact_edit_requests_contact_id_fkey(id, name),
      requester:users!contact_edit_requests_requester_id_fkey(id, name, email),
      requester_workspace:workspaces!contact_edit_requests_requester_workspace_id_fkey(id, name),
      owner_workspace:workspaces!contact_edit_requests_owner_workspace_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false })

  if (isAdmin) {
    // Admins see requests for their workspace contacts AND requests they sent
    query = query.or(`owner_workspace_id.eq.${profile.workspace_id},requester_id.eq.${user.id}`)
  } else {
    // Agents only see requests they sent
    query = query.eq('requester_id', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ requests: data ?? [] })
}
