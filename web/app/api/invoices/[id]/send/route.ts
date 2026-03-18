import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

type Params = { params: Promise<{ id: string }> }

// POST /api/invoices/[id]/send — send invoice via Resend, attach PDF
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, workspaces(name)')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; workspaces: { name: string } } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoice } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  if (!invoice.cliente_pec) return NextResponse.json({ error: 'Nessuna PEC/email cliente impostata' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Servizio email non configurato' }, { status: 500 })

  const resend = new Resend(resendKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@casaai.it'
  const workspaceName = profile.workspaces?.name ?? 'CasaAI'

  try {
    // Generate PDF via internal route
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    let pdfAttachment: { filename: string; content: number[] } | undefined
    try {
      const pdfRes = await fetch(`${appUrl}/api/invoices/${id}/pdf`, {
        headers: { Cookie: `sb-access-token=${user.id}` }
      })
      if (pdfRes.ok) {
        const pdfBuffer = await pdfRes.arrayBuffer()
        pdfAttachment = {
          filename: `Fattura-${invoice.numero_fattura}.pdf`,
          content: Array.from(new Uint8Array(pdfBuffer)),
        }
      }
    } catch { /* continue without attachment */ }

    const emailPayload: Parameters<typeof resend.emails.send>[0] = {
      from: `${workspaceName} <${fromEmail}>`,
      to: invoice.cliente_pec,
      subject: `Fattura ${invoice.numero_fattura} — ${workspaceName}`,
      html: `
        <p>Gentile ${invoice.cliente_nome},</p>
        <p>In allegato trovi la fattura n. <strong>${invoice.numero_fattura}</strong> del ${new Date(invoice.data_emissione).toLocaleDateString('it-IT')} per un importo di <strong>€ ${(invoice.totale_documento / 100).toFixed(2)}</strong>.</p>
        ${invoice.data_scadenza ? `<p>Scadenza pagamento: <strong>${new Date(invoice.data_scadenza).toLocaleDateString('it-IT')}</strong></p>` : ''}
        ${invoice.metodo_pagamento === 'bonifico' && invoice.iban ? `<p>IBAN: <strong>${invoice.iban}</strong></p>` : ''}
        <p>Per qualsiasi informazione non esitare a contattarci.</p>
        <br/>
        <p>Cordiali saluti,<br/>${workspaceName}</p>
      `,
    }
    if (pdfAttachment) {
      emailPayload.attachments = [pdfAttachment]
    }

    await resend.emails.send(emailPayload)

    // Update status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('invoices')
      .update({
        status: 'inviata',
        sent_at: new Date().toISOString(),
        sent_to_email: invoice.cliente_pec,
      })
      .eq('id', id)

    return NextResponse.json({ success: true, sent_to: invoice.cliente_pec })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Errore invio' }, { status: 500 })
  }
}
