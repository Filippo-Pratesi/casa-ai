import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profileData = profile as { workspace_id: string } | null
  if (!profileData?.workspace_id) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 400 })
  }

  const { contact_id, changes, note } = await req.json()

  if (!contact_id || !changes || typeof changes !== 'object') {
    return NextResponse.json({ error: 'contact_id e changes sono richiesti' }, { status: 400 })
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'Nessuna modifica proposta' }, { status: 400 })
  }

  // Verify contact exists and belongs to a shared workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact } = await (admin as any)
    .from('contacts')
    .select('id, workspace_id')
    .eq('id', contact_id)
    .single()

  if (!contact) return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })

  // Verify sharing is active between requester's workspace and owner's workspace
  const myWs = profileData.workspace_id
  const ownerWs = contact.workspace_id

  if (myWs === ownerWs) {
    return NextResponse.json({ error: 'Non puoi proporre modifiche ai tuoi contatti tramite questo endpoint' }, { status: 400 })
  }

  const [a, b] = [myWs, ownerWs].sort()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sharingRow } = await (admin as any)
    .from('group_contact_sharing')
    .select('enabled')
    .eq('workspace_a_id', a)
    .eq('workspace_b_id', b)
    .single()

  const sharing = sharingRow as { enabled: boolean } | null
  if (!sharing?.enabled) {
    return NextResponse.json({ error: 'La condivisione contatti non è attiva con questa agenzia' }, { status: 403 })
  }

  // Create the edit request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request, error } = await (admin as any)
    .from('contact_edit_requests')
    .insert({
      contact_id,
      owner_workspace_id: ownerWs,
      requester_id: user.id,
      requester_workspace_id: myWs,
      changes,
      note: note ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get requester's workspace name for notification
  const { data: requesterWs } = await admin
    .from('workspaces')
    .select('name')
    .eq('id', myWs)
    .single()

  // Get contact name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactDetails } = await (admin as any)
    .from('contacts')
    .select('name')
    .eq('id', contact_id)
    .single()

  // Notify all admins of the owner workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ownerAdmins } = await (admin as any)
    .from('users')
    .select('id')
    .eq('workspace_id', ownerWs)
    .in('role', ['admin', 'group_admin'])

  const requesterWsName = (requesterWs as { name: string } | null)?.name ?? 'Un\'agenzia del network'
  const contactName = (contactDetails as { name: string } | null)?.name ?? 'un contatto'

  const notifications = (ownerAdmins ?? []).map((a: { id: string }) => ({
    agent_id: a.id,
    workspace_id: ownerWs,
    type: 'contact_edit_request',
    title: 'Richiesta di modifica contatto',
    body: `${requesterWsName} propone una modifica al contatto "${contactName}". Verifica e approva o rifiuta.`,
    link: `/contacts?edit_request=${request.id}`,
  }))

  if (notifications.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('notifications').insert(notifications)
  }

  return NextResponse.json({ success: true, request_id: request.id })
}
