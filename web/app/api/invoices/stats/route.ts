import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface InvoiceStats {
  fatturato_ytd: number
  in_attesa: number
  scadute_importo: number
  media_incasso_giorni: number | null
  fatture_mese: number
  prossime_scadenze: number
  aging: {
    bucket_0_30: number
    bucket_31_60: number
    bucket_61_90: number
    bucket_91_plus: number
    invoices: AgingInvoice[]
  }
}

export interface AgingInvoice {
  id: string
  numero_fattura: string
  cliente_nome: string
  totale_documento: number
  data_scadenza: string | null
  status: string
  days_overdue: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .select('id, numero_fattura, cliente_nome, data_emissione, data_scadenza, data_pagamento, totale_documento, status')
    .eq('workspace_id', profile.workspace_id)
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(computeStats(data ?? []))
}

export function computeStats(rawInvoices: Record<string, unknown>[]): InvoiceStats {
  const invoices = rawInvoices as {
    id: string
    numero_fattura: string
    cliente_nome: string
    data_emissione: string
    data_scadenza: string | null
    data_pagamento: string | null
    totale_documento: number
    status: string
  }[]

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const thisYear = today.getFullYear()
  const thisMonth = `${thisYear}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const in7days = new Date(today)
  in7days.setDate(in7days.getDate() + 7)
  const in7daysStr = in7days.toISOString().split('T')[0]

  const fatturato_ytd = invoices
    .filter(i => i.status === 'pagata' && i.data_emissione.startsWith(String(thisYear)))
    .reduce((sum, i) => sum + i.totale_documento, 0)

  const in_attesa = invoices
    .filter(i => i.status === 'inviata')
    .reduce((sum, i) => sum + i.totale_documento, 0)

  const scadute_importo = invoices
    .filter(i => i.status === 'scaduta')
    .reduce((sum, i) => sum + i.totale_documento, 0)

  const paid = invoices.filter(i => i.status === 'pagata' && i.data_pagamento)
  const media_incasso_giorni = paid.length > 0
    ? Math.round(
        paid.reduce((sum, i) => {
          const emissione = new Date(i.data_emissione)
          const pagamento = new Date(i.data_pagamento!)
          return sum + (pagamento.getTime() - emissione.getTime()) / (1000 * 60 * 60 * 24)
        }, 0) / paid.length
      )
    : null

  const fatture_mese = invoices.filter(i => i.data_emissione.startsWith(thisMonth)).length

  const prossime_scadenze = invoices.filter(i =>
    i.status === 'inviata' &&
    i.data_scadenza &&
    i.data_scadenza >= todayStr &&
    i.data_scadenza <= in7daysStr
  ).length

  const openInvoices: AgingInvoice[] = invoices
    .filter(i => i.status === 'inviata' || i.status === 'scaduta')
    .map(i => {
      const refDate = i.data_scadenza ?? i.data_emissione
      const ref = new Date(refDate)
      const days_overdue = Math.max(0, Math.floor((today.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)))
      return {
        id: i.id,
        numero_fattura: i.numero_fattura,
        cliente_nome: i.cliente_nome,
        totale_documento: i.totale_documento,
        data_scadenza: i.data_scadenza,
        status: i.status,
        days_overdue,
      }
    })
    .sort((a, b) => b.days_overdue - a.days_overdue)

  const aging = {
    bucket_0_30: openInvoices.filter(i => i.days_overdue <= 30).reduce((s, i) => s + i.totale_documento, 0),
    bucket_31_60: openInvoices.filter(i => i.days_overdue > 30 && i.days_overdue <= 60).reduce((s, i) => s + i.totale_documento, 0),
    bucket_61_90: openInvoices.filter(i => i.days_overdue > 60 && i.days_overdue <= 90).reduce((s, i) => s + i.totale_documento, 0),
    bucket_91_plus: openInvoices.filter(i => i.days_overdue > 90).reduce((s, i) => s + i.totale_documento, 0),
    invoices: openInvoices,
  }

  return { fatturato_ytd, in_attesa, scadute_importo, media_incasso_giorni, fatture_mese, prossime_scadenze, aging }
}
