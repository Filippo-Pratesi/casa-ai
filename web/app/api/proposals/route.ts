import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/proposals
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('proposals')
    .select('id, numero_proposta, proponente_nome, immobile_indirizzo, immobile_citta, prezzo_offerto, prezzo_richiesto, data_proposta, validita_proposta, status')
    .eq('workspace_id', profile.workspace_id)
    .order('data_proposta', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ proposals: data ?? [] })
}

// POST /api/proposals
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id, role').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  if (!body.listing_id || !body.buyer_contact_id) {
    return NextResponse.json({ error: 'Immobile e acquirente obbligatori' }, { status: 400 })
  }

  const anno = typeof body.anno === 'number' ? body.anno : new Date().getFullYear()

  // Get next number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nextProg } = await (admin as any).rpc('next_proposal_number', {
    p_workspace_id: profile.workspace_id,
    p_anno: anno,
  })
  const progressivo = (nextProg as number) ?? 1
  const numero_proposta = `PA-${anno}/${String(progressivo).padStart(3, '0')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('proposals')
    .insert({
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      listing_id: body.listing_id,
      buyer_contact_id: body.buyer_contact_id,
      immobile_indirizzo: body.immobile_indirizzo ?? '',
      immobile_citta: body.immobile_citta ?? '',
      immobile_tipo: body.immobile_tipo ?? 'apartment',
      prezzo_richiesto: body.prezzo_richiesto ?? 0,
      proponente_nome: body.proponente_nome ?? '',
      proponente_codice_fiscale: body.proponente_codice_fiscale || null,
      proponente_telefono: body.proponente_telefono || null,
      proponente_email: body.proponente_email || null,
      proprietario_nome: body.proprietario_nome || null,
      agente_nome: body.agente_nome ?? '',
      agente_agenzia: body.agente_agenzia ?? '',
      prezzo_offerto: body.prezzo_offerto ?? 0,
      caparra_confirmatoria: body.caparra_confirmatoria ?? 0,
      caparra_in_gestione_agenzia: body.caparra_in_gestione_agenzia ?? false,
      data_proposta: body.data_proposta ?? new Date().toISOString().split('T')[0],
      validita_proposta: body.validita_proposta,
      data_rogito_proposta: body.data_rogito_proposta || null,
      notaio_preferito: body.notaio_preferito || null,
      note: body.note || null,
      vincoli: body.vincoli ?? [],
      numero_proposta,
      anno,
      progressivo,
      status: body.status ?? 'bozza',
    })
    .select('id, numero_proposta')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
