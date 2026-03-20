import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/invoices/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('invoices')
    .select('status, agent_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })

  const isOwner = existing.agent_id === user.id
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // Allowlist of mutable fields — reject anything not explicitly permitted
  const ALLOWED_FIELDS = [
    'cliente_nome', 'cliente_indirizzo', 'cliente_pec', 'cliente_codice_fiscale',
    'voci', 'imponibile', 'importo_iva', 'importo_ritenuta', 'importo_cassa',
    'totale_documento', 'netto_a_pagare', 'note', 'descrizione',
    'data_emissione', 'data_scadenza', 'data_pagamento',
    'metodo_pagamento', 'iban', 'status', 'listing_id',
  ] as const
  const updateable: Record<string, unknown> = {}
  for (const field of ALLOWED_FIELDS) {
    if (field in body) updateable[field] = body[field]
  }
  if (Object.keys(updateable).length === 0) {
    return NextResponse.json({ error: 'Nessun campo modificabile fornito' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('invoices')
    .update(updateable)
    .eq('id', id)
    .select('id, numero_fattura, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/invoices/[id] — only bozza invoices
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('invoices')
    .select('status, agent_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  if (existing.status !== 'bozza') return NextResponse.json({ error: 'Solo le bozze possono essere eliminate' }, { status: 403 })
  if (existing.agent_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
