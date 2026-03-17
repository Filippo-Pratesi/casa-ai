import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// GET /api/campaigns — list campaigns for workspace
export async function GET(_req: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('campaigns')
    .select('id, subject, status, sent_count, opened_count, created_at, sent_at, template')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ campaigns: data ?? [] })
}

// POST /api/campaigns — create and send campaign
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role, workspaces(name)')
    .eq('id', user.id)
    .single()
  const profile = profileData as {
    workspace_id: string
    role: string
    workspaces: { name: string }
  } | null

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const bodyHtml = typeof body.body_html === 'string' ? body.body_html.trim() : ''
  const bodyText = typeof body.body_text === 'string' ? body.body_text.trim() : bodyHtml.replace(/<[^>]+>/g, '')
  const template = typeof body.template === 'string' ? body.template : 'custom'
  const recipientFilter = (body.recipient_filter as Record<string, unknown>) ?? { type: 'all' }
  const sendNow = body.send === true

  if (!subject || !bodyHtml) {
    return NextResponse.json({ error: 'Oggetto e corpo obbligatori' }, { status: 400 })
  }

  // Resolve recipients
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contactsQuery = (admin as any)
    .from('contacts')
    .select('id, name, email')
    .eq('workspace_id', profile.workspace_id)
    .not('email', 'is', null)
    .neq('email', '')

  const filterType = recipientFilter.type as string
  if (filterType && filterType !== 'all') {
    contactsQuery = contactsQuery.eq('type', filterType)
  }
  if (typeof recipientFilter.city === 'string' && recipientFilter.city) {
    contactsQuery = contactsQuery.ilike('city', `%${recipientFilter.city}%`)
  }

  const { data: contactsData } = await contactsQuery
  const recipients = (contactsData ?? []) as { id: string; name: string; email: string }[]

  // Save campaign record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData, error: insertError } = await (admin as any)
    .from('campaigns')
    .insert({
      workspace_id: profile.workspace_id,
      created_by: user.id,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      template,
      recipient_filter: recipientFilter,
      status: sendNow ? 'sending' : 'draft',
    })
    .select('id')
    .single()

  if (insertError || !campaignData) {
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  const campaignId = (campaignData as { id: string }).id

  if (!sendNow || recipients.length === 0) {
    return NextResponse.json({ id: campaignId, sent: 0 }, { status: 201 })
  }

  // Send via Resend
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('campaigns').update({ status: 'failed' }).eq('id', campaignId)
    return NextResponse.json({ error: 'Resend non configurato' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@casaai.it'
  const fromName = profile.workspaces.name

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.casaai.it'
  let sentCount = 0
  for (const contact of recipients) {
    try {
      const trackingPixel = `<img src="${appUrl}/api/track/open/${campaignId}/${contact.id}" width="1" height="1" style="display:none" alt="" />`
      const htmlWithTracking = bodyHtml
        + `<br/><br/><small style="color:#999">Per cancellarti dalla lista, contatta ${fromName}.</small>`
        + trackingPixel
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: contact.email,
        subject,
        html: htmlWithTracking,
        text: bodyText,
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
    .eq('id', campaignId)

  return NextResponse.json({ id: campaignId, sent: sentCount }, { status: 201 })
}
