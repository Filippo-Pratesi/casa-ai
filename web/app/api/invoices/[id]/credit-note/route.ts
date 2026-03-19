import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// POST /api/invoices/[id]/credit-note — emit nota di credito from a paid/sent invoice
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: original } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!original) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  if (original.document_type === 'nota_credito') {
    return NextResponse.json({ error: 'Non è possibile emettere una nota di credito da un\'altra nota di credito' }, { status: 400 })
  }
  if (original.status !== 'pagata' && original.status !== 'inviata') {
    return NextResponse.json({ error: 'Solo le fatture inviate o pagate possono generare una nota di credito' }, { status: 400 })
  }

  // Check if a NC already exists for this invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('invoices')
    .select('id, numero_fattura')
    .eq('related_invoice_id', id)
    .eq('workspace_id', profile.workspace_id)
    .eq('document_type', 'nota_credito')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Nota di credito già emessa: ${existing.numero_fattura}`,
      existing_id: existing.id,
    }, { status: 409 })
  }

  const anno = new Date().getFullYear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nextProg } = await (admin as any).rpc('next_invoice_number', {
    p_workspace_id: profile.workspace_id,
    p_anno: anno,
  })
  const progressivo = (nextProg as number) ?? 1
  const numero_fattura = `NC-${anno}/${String(progressivo).padStart(3, '0')}`
  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .insert({
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      document_type: 'nota_credito',
      related_invoice_id: id,
      numero_fattura,
      anno,
      progressivo,
      contact_id: original.contact_id,
      listing_id: original.listing_id,
      proposal_id: original.proposal_id,
      cliente_nome: original.cliente_nome,
      cliente_indirizzo: original.cliente_indirizzo,
      cliente_citta: original.cliente_citta,
      cliente_cap: original.cliente_cap,
      cliente_provincia: original.cliente_provincia,
      cliente_codice_fiscale: original.cliente_codice_fiscale,
      cliente_pec: original.cliente_pec,
      cliente_codice_sdi: original.cliente_codice_sdi,
      emittente_nome: original.emittente_nome,
      emittente_indirizzo: original.emittente_indirizzo,
      emittente_citta: original.emittente_citta,
      emittente_cap: original.emittente_cap,
      emittente_provincia: original.emittente_provincia,
      emittente_partita_iva: original.emittente_partita_iva,
      emittente_codice_fiscale: original.emittente_codice_fiscale,
      regime: original.regime,
      descrizione: `Nota di credito — ${original.descrizione}`,
      voci: original.voci,
      imponibile: original.imponibile,
      aliquota_iva: original.aliquota_iva,
      importo_iva: original.importo_iva,
      ritenuta_acconto: original.ritenuta_acconto,
      aliquota_ritenuta: original.aliquota_ritenuta,
      importo_ritenuta: original.importo_ritenuta,
      contributo_cassa: original.contributo_cassa,
      aliquota_cassa: original.aliquota_cassa,
      importo_cassa: original.importo_cassa,
      totale_documento: original.totale_documento,
      netto_a_pagare: original.netto_a_pagare,
      metodo_pagamento: original.metodo_pagamento,
      iban: original.iban,
      data_emissione: today,
      data_scadenza: null,
      note: `Nota di credito a storno della fattura n. ${original.numero_fattura} del ${new Date(original.data_emissione).toLocaleDateString('it-IT')}.`,
      status: 'bozza',
    })
    .select('id, numero_fattura')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
