import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// POST /api/proposals/[id]/counter-offer
// Creates a counter-proposal from the seller
export async function POST(req: NextRequest, { params }: Params) {
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
    .from('proposals')
    .select('status, agent_id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Proposta non trovata' }, { status: 404 })
  if (existing.status !== 'inviata') {
    return NextResponse.json({ error: 'La controproposta è possibile solo su proposte inviate' }, { status: 400 })
  }

  const isOwner = existing.agent_id === user.id
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // Insert counter-offer record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: counter, error: counterErr } = await (admin as any)
    .from('counter_proposals')
    .insert({
      proposal_id: id,
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      prezzo_controproposto: body.prezzo_controproposto ?? 0,
      validita_risposta: body.validita_risposta ?? null,
      note_venditore: body.note_venditore ?? null,
      data_rogito_proposta: body.data_rogito_proposta ?? null,
    })
    .select('id')
    .single()

  if (counterErr) return NextResponse.json({ error: counterErr.message }, { status: 500 })

  // Update proposal status to 'controproposta'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('proposals')
    .update({ status: 'controproposta' })
    .eq('id', id)

  return NextResponse.json({ counter_id: counter.id }, { status: 201 })
}
