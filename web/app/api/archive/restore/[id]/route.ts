import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Get user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any).from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Fetch archived listing — scoped to workspace for security
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: archived } = await (admin as any)
    .from('archived_listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!archived) return NextResponse.json({ error: 'Archivio non trovato' }, { status: 404 })

  // Strip archive-specific fields and restore as a draft listing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, archived_at, archived_by_user_id, sold, sold_to_contact_id, sold_to_name, original_id, ...fields } = archived

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: restored, error } = await (admin as any)
    .from('listings')
    .insert({ ...fields, status: 'draft', agent_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing_id: (restored as { id: string }).id })
}
