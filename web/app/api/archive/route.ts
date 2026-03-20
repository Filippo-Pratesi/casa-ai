import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/archive — list archived listings and contacts for the workspace
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const [listingsRes, contactsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('archived_listings')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('archived_contacts')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false }),
  ])

  return NextResponse.json({
    listings: listingsRes.data ?? [],
    contacts: contactsRes.data ?? [],
  })
}
