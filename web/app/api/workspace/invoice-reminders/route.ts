import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/workspace/invoice-reminders — toggle reminder_automatici for workspace
export async function PATCH(req: NextRequest) {
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })
  if (profile.role !== 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Solo gli admin possono modificare questa impostazione' }, { status: 403 })
  }

  const body = await req.json()
  const { reminder_automatici } = body
  if (typeof reminder_automatici !== 'boolean') {
    return NextResponse.json({ error: 'Parametro non valido' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('workspaces')
    .update({ reminder_automatici })
    .eq('id', profile.workspace_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, reminder_automatici })
}
