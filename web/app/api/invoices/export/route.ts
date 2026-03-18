import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/invoices/export?format=csv&from=&to=&status=
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const status = searchParams.get('status')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('invoices')
    .select('numero_fattura, cliente_nome, data_emissione, data_scadenza, imponibile, importo_iva, totale_documento, netto_a_pagare, status, regime, metodo_pagamento')
    .eq('workspace_id', profile.workspace_id)
    .order('data_emissione', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (from) query = query.gte('data_emissione', from)
  if (to) query = query.lte('data_emissione', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoices = (data ?? []) as Record<string, unknown>[]

  function centsToEuro(cents: unknown): string {
    const n = typeof cents === 'number' ? cents : 0
    return (n / 100).toFixed(2).replace('.', ',')
  }

  const statusLabels: Record<string, string> = { bozza: 'Bozza', inviata: 'Inviata', pagata: 'Pagata', scaduta: 'Scaduta' }

  const headers = ['Numero', 'Cliente', 'Data Emissione', 'Scadenza', 'Imponibile', 'IVA', 'Totale Documento', 'Netto a Pagare', 'Stato', 'Regime', 'Metodo Pagamento']
  const rows = invoices.map(inv => [
    inv.numero_fattura as string,
    `"${(inv.cliente_nome as string || '').replace(/"/g, '""')}"`,
    inv.data_emissione as string || '',
    inv.data_scadenza as string || '',
    centsToEuro(inv.imponibile),
    centsToEuro(inv.importo_iva),
    centsToEuro(inv.totale_documento),
    centsToEuro(inv.netto_a_pagare),
    statusLabels[inv.status as string] || inv.status as string,
    inv.regime as string || '',
    inv.metodo_pagamento as string || '',
  ])

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const bom = '\uFEFF'

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fatture-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
