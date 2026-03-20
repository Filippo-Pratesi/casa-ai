import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string; contact_link_id: string }> }

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
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

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const admin = createAdminClient()

  // Fetch contact info before deleting for the event log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkRow } = await (admin as any)
    .from('property_contacts')
    .select('role, contacts(name)')
    .eq('id', contact_link_id)
    .eq('workspace_id', workspaceId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('property_contacts')
    .delete()
    .eq('id', contact_link_id)
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: "Errore nella rimozione del contatto" }, { status: 500 })

  // Auto-event: contact removed
  if (linkRow) {
    const ROLE_IT: Record<string, string> = {
      proprietario: 'Proprietario', moglie_marito: 'Moglie/Marito', figlio_figlia: 'Figlio/Figlia',
      vicino: 'Vicino', portiere: 'Portiere', amministratore: 'Amministratore',
      avvocato: 'Avvocato', commercialista: 'Commercialista',
      precedente_proprietario: 'Ex proprietario', inquilino: 'Inquilino', altro: 'Altro',
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = linkRow as any
    const contactName = row.contacts?.name ?? 'Contatto'
    const roleLabel = ROLE_IT[row.role] ?? row.role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('property_events').insert({
      workspace_id: workspaceId,
      property_id: id,
      agent_id: user.id,
      event_type: 'contatto_rimosso',
      title: `${contactName} rimosso (ruolo: ${roleLabel})`,
    })
  }

  return NextResponse.json({ success: true })
}
