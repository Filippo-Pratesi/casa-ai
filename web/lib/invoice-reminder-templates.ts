export type ReminderType = 'pre_scadenza_7g' | 'giorno_scadenza' | 'post_scadenza_7g' | 'post_scadenza_30g'

interface InvoiceData {
  numero_fattura: string
  cliente_nome: string
  data_emissione: string
  data_scadenza: string
  totale_documento: number
  netto_a_pagare: number
  metodo_pagamento: string | null
  iban: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatEuro(cents: number) {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function paymentInfo(inv: InvoiceData) {
  if (inv.metodo_pagamento === 'bonifico' && inv.iban) {
    return `<p>Ti ricordiamo che il pagamento deve essere effettuato tramite <strong>bonifico bancario</strong> al seguente IBAN: <strong>${inv.iban}</strong></p>`
  }
  return ''
}

function baseWrapper(workspaceName: string, body: string) {
  return `
    <!DOCTYPE html>
    <html lang="it">
    <body style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px;">
      ${body}
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #999;">Questa è una comunicazione automatica di <strong>${workspaceName}</strong>. Non rispondere a questa email.</p>
    </body>
    </html>
  `
}

export function reminderSubject(type: ReminderType, inv: InvoiceData): string {
  switch (type) {
    case 'pre_scadenza_7g':
      return `Promemoria: Fattura ${inv.numero_fattura} in scadenza tra 7 giorni`
    case 'giorno_scadenza':
      return `Scadenza oggi: Fattura ${inv.numero_fattura}`
    case 'post_scadenza_7g':
      return `Sollecito: Fattura ${inv.numero_fattura} scaduta da 7 giorni`
    case 'post_scadenza_30g':
      return `Sollecito formale: Fattura ${inv.numero_fattura} — pagamento in ritardo`
  }
}

export function reminderHtml(type: ReminderType, inv: InvoiceData, workspaceName: string): string {
  switch (type) {
    case 'pre_scadenza_7g':
      return baseWrapper(workspaceName, `
        <p>Gentile ${inv.cliente_nome},</p>
        <p>Le ricordiamo che la fattura n. <strong>${inv.numero_fattura}</strong> del ${formatDate(inv.data_emissione)}
        dell'importo di <strong>${formatEuro(inv.netto_a_pagare)}</strong> è in scadenza il <strong>${formatDate(inv.data_scadenza)}</strong> (tra 7 giorni).</p>
        ${paymentInfo(inv)}
        <p>La ringraziamo per la collaborazione.</p>
        <br/>
        <p>Cordiali saluti,<br/><strong>${workspaceName}</strong></p>
      `)

    case 'giorno_scadenza':
      return baseWrapper(workspaceName, `
        <p>Gentile ${inv.cliente_nome},</p>
        <p>Le ricordiamo che la fattura n. <strong>${inv.numero_fattura}</strong> del ${formatDate(inv.data_emissione)}
        dell'importo di <strong>${formatEuro(inv.netto_a_pagare)}</strong> <strong>scade oggi</strong>, ${formatDate(inv.data_scadenza)}.</p>
        ${paymentInfo(inv)}
        <p>Se ha già provveduto al pagamento, ignori questo messaggio.</p>
        <br/>
        <p>Cordiali saluti,<br/><strong>${workspaceName}</strong></p>
      `)

    case 'post_scadenza_7g':
      return baseWrapper(workspaceName, `
        <p>Gentile ${inv.cliente_nome},</p>
        <p>Le segnaliamo che la fattura n. <strong>${inv.numero_fattura}</strong> del ${formatDate(inv.data_emissione)}
        dell'importo di <strong>${formatEuro(inv.netto_a_pagare)}</strong> risulta <strong>scaduta dal ${formatDate(inv.data_scadenza)}</strong>.</p>
        <p>La preghiamo di provvedere al pagamento nel più breve tempo possibile.</p>
        ${paymentInfo(inv)}
        <p>Per qualsiasi chiarimento non esiti a contattarci.</p>
        <br/>
        <p>Cordiali saluti,<br/><strong>${workspaceName}</strong></p>
      `)

    case 'post_scadenza_30g':
      return baseWrapper(workspaceName, `
        <p>Gentile ${inv.cliente_nome},</p>
        <p>Nonostante i precedenti solleciti, la fattura n. <strong>${inv.numero_fattura}</strong> del ${formatDate(inv.data_emissione)}
        dell'importo di <strong>${formatEuro(inv.netto_a_pagare)}</strong> risulta ancora <strong>insoluta</strong> con scadenza ${formatDate(inv.data_scadenza)}.</p>
        <p>La invitiamo a regolarizzare la sua posizione entro i prossimi 5 giorni lavorativi, pena il ricorso alle vie legali.</p>
        ${paymentInfo(inv)}
        <p>Rimaniamo disponibili per trovare una soluzione.</p>
        <br/>
        <p>Distinti saluti,<br/><strong>${workspaceName}</strong></p>
      `)
  }
}

export function buildReminders(invoiceId: string, workspaceId: string, dataScadenza: string) {
  const scad = new Date(dataScadenza)

  function offsetDays(base: Date, days: number) {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    d.setHours(9, 0, 0, 0) // send at 9am
    return d.toISOString()
  }

  return [
    { invoice_id: invoiceId, workspace_id: workspaceId, reminder_type: 'pre_scadenza_7g',  scheduled_at: offsetDays(scad, -7) },
    { invoice_id: invoiceId, workspace_id: workspaceId, reminder_type: 'giorno_scadenza',   scheduled_at: offsetDays(scad, 0)  },
    { invoice_id: invoiceId, workspace_id: workspaceId, reminder_type: 'post_scadenza_7g',  scheduled_at: offsetDays(scad, 7)  },
    { invoice_id: invoiceId, workspace_id: workspaceId, reminder_type: 'post_scadenza_30g', scheduled_at: offsetDays(scad, 30) },
  ]
}
