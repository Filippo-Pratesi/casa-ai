import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH - Approve or reject an edit request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  if (!isAdmin) {
    return NextResponse.json({ error: 'Solo gli admin possono approvare o rifiutare le richieste' }, { status: 403 })
  }

  const { action, rejection_reason } = await req.json()
  if (!action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'action deve essere "approved" o "rejected"' }, { status: 400 })
  }

  // Fetch the request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: request } = await (admin as any)
    .from('contact_edit_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (!request) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'La richiesta è già stata elaborata' }, { status: 400 })
  }

  // Verify admin owns the contact's workspace
  if (request.owner_workspace_id !== profile.workspace_id && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Non puoi gestire richieste per questo workspace' }, { status: 403 })
  }

  // Update status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin as any)
    .from('contact_edit_requests')
    .update({
      status: action,
      rejection_reason: action === 'rejected' ? (rejection_reason ?? null) : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // If approved, apply changes to the contact
  if (action === 'approved') {
    const changes = request.changes as Record<string, { old: string; new: string }>
    const patch: Record<string, string> = {}
    for (const [field, diff] of Object.entries(changes)) {
      patch[field] = diff.new
    }
    if (Object.keys(patch).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: patchErr } = await (admin as any)
        .from('contacts')
        .update(patch)
        .eq('id', request.contact_id)
      if (patchErr) return NextResponse.json({ error: `Modifiche non applicate: ${patchErr.message}` }, { status: 500 })
    }
  }

  // Notify the requester
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactDetails } = await (admin as any)
    .from('contacts')
    .select('name')
    .eq('id', request.contact_id)
    .single()

  const { data: ownerWs } = await admin
    .from('workspaces')
    .select('name')
    .eq('id', request.owner_workspace_id)
    .single()

  const contactName = (contactDetails as { name: string } | null)?.name ?? 'un contatto'
  const ownerName = (ownerWs as { name: string } | null)?.name ?? 'un\'agenzia'

  const notifTitle = action === 'approved' ? 'Modifica approvata' : 'Modifica rifiutata'
  const notifBody = action === 'approved'
    ? `${ownerName} ha approvato la tua proposta di modifica per "${contactName}".`
    : `${ownerName} ha rifiutato la tua proposta di modifica per "${contactName}"${rejection_reason ? `: ${rejection_reason}` : '.'}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('notifications').insert({
    agent_id: request.requester_id,
    workspace_id: request.requester_workspace_id,
    type: `contact_edit_${action}`,
    title: notifTitle,
    body: notifBody,
    link: '/contacts',
  })

  return NextResponse.json({ success: true })
}
