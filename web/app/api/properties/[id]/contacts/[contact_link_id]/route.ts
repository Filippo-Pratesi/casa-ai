import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ id: string; contact_link_id: string }> }

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// DELETE /api/properties/[id]/contacts/[contact_link_id] — remove contact link (not the contact itself)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id, contact_link_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('property_contacts')
    .delete()
    .eq('id', contact_link_id)
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: "Errore nella rimozione del contatto" }, { status: 500 })

  return NextResponse.json({ success: true })
}
