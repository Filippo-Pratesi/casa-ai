import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// POST /api/proposals/[id]/generate-invoice — create bozza invoice from accepted proposal
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: proposal } = await (admin as any)
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!proposal) return NextResponse.json({ error: 'Proposta non trovata' }, { status: 404 })
  if (proposal.status !== 'accettata') {
    return NextResponse.json({ error: 'Solo le proposte accettate possono generare una fattura' }, { status: 400 })
  }

  // Check no invoice already linked to this proposal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('invoices')
    .select('id, numero_fattura')
    .eq('proposal_id', id)
    .eq('workspace_id', profile.workspace_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Fattura già generata da questa proposta: ${existing.numero_fattura}`,
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
  const numero_fattura = `${anno}/${String(progressivo).padStart(3, '0')}`
  const today = new Date().toISOString().split('T')[0]

  const descrizione = proposal.immobile_indirizzo
    ? `Provvigione per intermediazione immobiliare — ${proposal.immobile_indirizzo}${proposal.immobile_citta ? ', ' + proposal.immobile_citta : ''}`
    : 'Provvigione per intermediazione immobiliare'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .insert({
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      numero_fattura,
      anno,
      progressivo,
      proposal_id: id,
      listing_id: proposal.listing_id ?? null,
      contact_id: proposal.contact_id ?? null,
      cliente_nome: proposal.proponente_nome ?? '',
      cliente_indirizzo: null,
      cliente_citta: null,
      cliente_cap: null,
      cliente_provincia: null,
      cliente_codice_fiscale: proposal.proponente_codice_fiscale ?? null,
      cliente_pec: proposal.proponente_email ?? null,
      cliente_codice_sdi: '0000000',
      emittente_nome: proposal.agente_agenzia ?? 'CasaAI',
      regime: 'ordinario',
      descrizione,
      voci: [],
      imponibile: 0,
      aliquota_iva: 22,
      importo_iva: 0,
      ritenuta_acconto: false,
      aliquota_ritenuta: 20,
      importo_ritenuta: 0,
      contributo_cassa: false,
      aliquota_cassa: 0,
      importo_cassa: 0,
      totale_documento: 0,
      netto_a_pagare: 0,
      metodo_pagamento: 'bonifico',
      iban: null,
      data_emissione: today,
      data_scadenza: null,
      note: `Riferimento proposta n. ${proposal.numero_proposta} del ${new Date(proposal.data_proposta).toLocaleDateString('it-IT')} — Prezzo concordato: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(proposal.prezzo_offerto ?? 0)}`,
      status: 'bozza',
    })
    .select('id, numero_fattura')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
