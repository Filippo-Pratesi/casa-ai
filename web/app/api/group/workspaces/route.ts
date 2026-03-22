import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - Create a new workspace within the group
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('users')
    .select('role, group_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'group_admin') {
    return NextResponse.json({ error: 'Accesso riservato al group admin' }, { status: 403 })
  }
  if (!profile.group_id) {
    return NextResponse.json({ error: 'Nessun gruppo associato' }, { status: 400 })
  }

  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Il nome dell\'agenzia è obbligatorio' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace, error } = await (admin as any)
    .from('workspaces')
    .insert({ name: name.trim(), group_id: profile.group_id, plan: 'network' })
    .select('id, name')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workspace })
}
