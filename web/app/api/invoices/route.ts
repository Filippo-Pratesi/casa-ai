import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/invoices — list invoices for workspace
export async function GET(_req: NextRequest) {
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
    .select('id, numero_fattura, cliente_nome, data_emissione, data_scadenza, totale_documento, netto_a_pagare, status, descrizione, listing_id')
    .eq('workspace_id', profile.workspace_id)
    .order('data_emissione', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data ?? [] })
}

// POST /api/invoices — create invoice
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id, role').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const cliente_nome = typeof body.cliente_nome === 'string' ? body.cliente_nome.trim() : ''
  if (!cliente_nome) return NextResponse.json({ error: 'Nome cliente obbligatorio' }, { status: 400 })

  const anno = typeof body.anno === 'number' ? body.anno : new Date().getFullYear()

  // Get next progressive number (race-safe via unique constraint)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nextProg } = await (admin as any).rpc('next_invoice_number', {
    p_workspace_id: profile.workspace_id,
    p_anno: anno,
  })
  const progressivo = (nextProg as number) ?? 1
  const numero_fattura = `${anno}/${String(progressivo).padStart(3, '0')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .insert({
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      numero_fattura,
      anno,
      progressivo,
      proposal_id: body.proposal_id || null,
      contact_id: body.contact_id || null,
      listing_id: body.listing_id || null,
      cliente_nome,
      cliente_indirizzo: body.cliente_indirizzo || null,
      cliente_citta: body.cliente_citta || null,
      cliente_cap: body.cliente_cap || null,
      cliente_provincia: body.cliente_provincia || null,
      cliente_codice_fiscale: body.cliente_codice_fiscale || null,
      cliente_pec: body.cliente_pec || null,
      cliente_codice_sdi: body.cliente_codice_sdi || '0000000',
      emittente_nome: body.emittente_nome || 'CasaAI',
      regime: body.regime || 'ordinario',
      descrizione: body.descrizione || 'Provvigione per intermediazione immobiliare',
      voci: body.voci || [],
      imponibile: body.imponibile || 0,
      aliquota_iva: body.aliquota_iva ?? 22,
      importo_iva: body.importo_iva || 0,
      ritenuta_acconto: body.ritenuta_acconto ?? false,
      aliquota_ritenuta: body.aliquota_ritenuta ?? 20,
      importo_ritenuta: body.importo_ritenuta || 0,
      contributo_cassa: body.contributo_cassa ?? false,
      aliquota_cassa: body.aliquota_cassa ?? 0,
      importo_cassa: body.importo_cassa || 0,
      totale_documento: body.totale_documento || 0,
      netto_a_pagare: body.netto_a_pagare || 0,
      metodo_pagamento: body.metodo_pagamento || 'bonifico',
      iban: body.iban || null,
      data_emissione: body.data_emissione || new Date().toISOString().split('T')[0],
      data_scadenza: body.data_scadenza || null,
      note: body.note || null,
      status: body.status || 'bozza',
    })
    .select('id, numero_fattura')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
