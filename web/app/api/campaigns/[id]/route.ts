import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// PATCH /api/campaigns/[id] — update (and optionally send) a draft campaign
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role, workspaces(name)')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string; workspaces: { name: string } } | null
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Fetch the campaign to verify ownership and draft status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData } = await (admin as any)
    .from('campaigns')
    .select('id, status, workspace_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!campaignData) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 })
  }
  if (campaignData.status !== 'draft') {
    return NextResponse.json({ error: 'Solo le bozze possono essere modificate' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : undefined
  const bodyHtml = typeof body.body_html === 'string' ? body.body_html.trim() : undefined
  const bodyText = typeof body.body_text === 'string' ? body.body_text.trim() : undefined
  const template = typeof body.template === 'string' ? body.template : undefined
  const explicitContactIds = Array.isArray(body.contact_ids) ? (body.contact_ids as string[]) : null
  const recipientFilter = explicitContactIds
    ? { mode: 'explicit', contact_ids: explicitContactIds }
    : (body.recipient_filter as Record<string, unknown> | undefined)
  const sendNow = body.send === true

  if (subject !== undefined && !subject) {
    return NextResponse.json({ error: 'Oggetto non può essere vuoto' }, { status: 400 })
  }
  if (bodyHtml !== undefined && !bodyHtml) {
    return NextResponse.json({ error: 'Corpo non può essere vuoto' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (subject !== undefined) updates.subject = subject
  if (bodyHtml !== undefined) updates.body_html = bodyHtml
  if (bodyText !== undefined) updates.body_text = bodyText
  if (template !== undefined) updates.template = template
  if (recipientFilter !== undefined) updates.recipient_filter = recipientFilter

  // If sending, mark as sending first
  if (sendNow) updates.status = 'sending'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin as any)
    .from('campaigns')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  if (!sendNow) {
    return NextResponse.json({ id })
  }

  // --- Send the campaign ---
  const finalSubject = (subject ?? '') || ''
  const finalBodyHtml = (bodyHtml ?? '') || ''
  const finalBodyText = (bodyText ?? finalBodyHtml.replace(/<[^>]+>/g, '')) || ''

  // Resolve recipients — explicit list takes priority
  let recipients: { id: string; name: string; email: string }[] = []
  if (explicitContactIds && explicitContactIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('contacts')
      .select('id, name, email')
      .eq('workspace_id', profile.workspace_id)
      .in('id', explicitContactIds)
      .not('email', 'is', null)
      .neq('email', '')
    recipients = (data ?? []) as { id: string; name: string; email: string }[]
  } else {
    // Legacy filter-based resolution
    const finalFilter = (recipientFilter ?? { type: 'all' }) as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contactsQuery = (admin as any)
      .from('contacts')
      .select('id, name, email')
      .eq('workspace_id', profile.workspace_id)
      .not('email', 'is', null)
      .neq('email', '')
    const filterType = finalFilter.type as string
    if (filterType && filterType !== 'all') {
      contactsQuery = contactsQuery.eq('type', filterType)
    }
    if (typeof finalFilter.city === 'string' && finalFilter.city) {
      contactsQuery = contactsQuery.ilike('city_of_residence', `%${finalFilter.city}%`)
    }
    const { data: contactsData } = await contactsQuery
    recipients = (contactsData ?? []) as { id: string; name: string; email: string }[]
  }

  if (recipients.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('campaigns').update({ status: 'draft' }).eq('id', id)
    return NextResponse.json({ id, sent: 0 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('campaigns').update({ status: 'failed' }).eq('id', id)
    return NextResponse.json({ error: 'Resend non configurato' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@casaai.it'
  const fromName = profile.workspaces.name
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.casaai.it'

  let sentCount = 0
  for (const contact of recipients) {
    try {
      const trackingPixel = `<img src="${appUrl}/api/track/open/${id}/${contact.id}" width="1" height="1" style="display:none" alt="" />`
      const htmlWithTracking = finalBodyHtml
        + `<br/><br/><small style="color:#999">Per cancellarti dalla lista, contatta ${fromName}.</small>`
        + trackingPixel
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: contact.email,
        subject: finalSubject,
        html: htmlWithTracking,
        text: finalBodyText,
      })
      sentCount++
    } catch {
      // skip failed individual sends
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('campaigns')
    .update({ status: 'sent', sent_count: sentCount, sent_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ id, sent: sentCount })
}

// DELETE /api/campaigns/[id] — delete a draft campaign
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
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // Fetch the campaign to verify ownership and draft status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData } = await (admin as any)
    .from('campaigns')
    .select('id, status, workspace_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!campaignData) {
    return NextResponse.json({ error: 'Campagna non trovata' }, { status: 404 })
  }
  if (campaignData.status !== 'draft') {
    return NextResponse.json({ error: 'Solo le bozze possono essere eliminate' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (admin as any)
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: "Errore nell'eliminazione" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
