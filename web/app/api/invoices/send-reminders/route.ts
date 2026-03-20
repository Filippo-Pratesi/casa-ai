import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { reminderSubject, reminderHtml, type ReminderType } from '@/lib/invoice-reminder-templates'

// POST /api/invoices/send-reminders — cron endpoint, no user auth required (use CRON_SECRET)
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET non configurato' }, { status: 500 })
  }
  const secret = req.headers.get('x-cron-secret')
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Resend non configurato' }, { status: 500 })

  const admin = createAdminClient()
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@casaai.it'
  const resend = new Resend(resendKey)

  // Find pending reminders due now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reminders, error } = await (admin as any)
    .from('invoice_reminders')
    .select('id, workspace_id, invoice_id, reminder_type')
    .is('sent_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reminders?.length) return NextResponse.json({ sent: 0, message: 'Nessun reminder da inviare' })

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const reminder of reminders as { id: string; workspace_id: string; invoice_id: string; reminder_type: string }[]) {
    try {
      // Check workspace has reminders enabled
      const { data: ws } = await admin
        .from('workspaces')
        .select('name, reminder_automatici')
        .eq('id', reminder.workspace_id)
        .single()
      const workspace = ws as { name: string; reminder_automatici: boolean } | null

      if (!workspace?.reminder_automatici) {
        skipped++
        // Mark as skipped so we don't process again (use sent_at to mark, sent_to_email as 'skipped')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from('invoice_reminders')
          .update({ sent_at: new Date().toISOString(), sent_to_email: '_skipped_' })
          .eq('id', reminder.id)
        continue
      }

      // Fetch invoice
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inv } = await (admin as any)
        .from('invoices')
        .select('numero_fattura, cliente_nome, cliente_pec, data_emissione, data_scadenza, totale_documento, netto_a_pagare, metodo_pagamento, iban, status')
        .eq('id', reminder.invoice_id)
        .eq('workspace_id', reminder.workspace_id)
        .single()

      if (!inv) { skipped++; continue }
      // Skip if already paid
      if (inv.status === 'pagata' || inv.status === 'bozza') { skipped++; continue }
      if (!inv.cliente_pec) { skipped++; continue }
      if (!inv.data_scadenza) { skipped++; continue }

      const type = reminder.reminder_type as ReminderType
      await resend.emails.send({
        from: `${workspace.name} <${fromEmail}>`,
        to: inv.cliente_pec,
        subject: reminderSubject(type, inv),
        html: reminderHtml(type, inv, workspace.name),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('invoice_reminders')
        .update({ sent_at: new Date().toISOString(), sent_to_email: inv.cliente_pec })
        .eq('id', reminder.id)

      sent++
    } catch (e) {
      errors.push(`reminder ${reminder.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ sent, skipped, errors: errors.length ? errors : undefined })
}
