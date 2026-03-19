import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE /api/agent-zones/[id] — remove assignment (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile?.workspace_id) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  if (profile.role !== 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('agent_zones')
    .delete()
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (error) return NextResponse.json({ error: 'Errore nella rimozione' }, { status: 500 })

  return NextResponse.json({ success: true })
}
