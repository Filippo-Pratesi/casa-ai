import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // Get user workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userProfile } = await (admin as any)
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  if (!userProfile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const { incarico_type, incarico_date, incarico_expiry, incarico_commission_percent, incarico_notes } = body

  // Validate required fields
  if (!incarico_type || !incarico_date || !incarico_commission_percent) {
    return NextResponse.json({ error: 'Tipo, data e provvigione sono obbligatori' }, { status: 400 })
  }

  const commission = parseFloat(String(incarico_commission_percent))
  if (isNaN(commission) || commission <= 0 || commission > 20) {
    return NextResponse.json({ error: 'Provvigione deve essere tra 0% e 20%' }, { status: 400 })
  }

  // Fetch property — must be workspace-scoped and in 'incarico' stage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error: fetchError } = await (admin as any)
    .from('properties')
    .select('id, stage, address, workspace_id, owner_contact_id')
    .eq('id', id)
    .eq('workspace_id', userProfile.workspace_id)
    .single()

  if (fetchError || !property) {
    return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  }

  if (property.stage !== 'incarico') {
    return NextResponse.json({ error: "Il rinnovo è disponibile solo per gli immobili in fase 'incarico'" }, { status: 400 })
  }

  // PATCH property with new incarico fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateError } = await (admin as any)
    .from('properties')
    .update({
      incarico_type,
      incarico_date,
      incarico_expiry: incarico_expiry || null,
      incarico_commission_percent: commission,
      incarico_notes: incarico_notes || null,
    })
    .eq('id', id)
    .eq('workspace_id', userProfile.workspace_id)
    .select('*')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Errore aggiornamento incarico' }, { status: 500 })
  }

  const address = (updated.address as string | undefined) ?? 'Indirizzo sconosciuto'
  const expiryLabel = incarico_expiry
    ? `Scadenza: ${new Date(incarico_expiry as string).toLocaleDateString('it-IT')}`
    : null

  // Insert rinnovo_incarico property event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('property_events').insert({
    workspace_id: userProfile.workspace_id,
    property_id: id,
    agent_id: user.id,
    event_type: 'rinnovo_incarico',
    title: 'Incarico rinnovato',
    description: [
      `Tipo: ${incarico_type}`,
      `Data firma: ${new Date(incarico_date as string).toLocaleDateString('it-IT')}`,
      expiryLabel,
      `Provvigione: ${commission}%`,
      incarico_notes || null,
    ].filter(Boolean).join(' · '),
    metadata: {
      incarico_type,
      incarico_date,
      incarico_expiry: incarico_expiry || null,
      incarico_commission_percent: commission,
    },
  })

  // Also add contact_event for owner cronistoria
  if (property.owner_contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('contact_events').insert({
      workspace_id: userProfile.workspace_id,
      contact_id: property.owner_contact_id,
      agent_id: user.id,
      event_type: 'incarico_firmato',
      title: `Incarico rinnovato: ${address}`,
      body: expiryLabel,
      related_property_id: id,
    })
  }

  return NextResponse.json({ property: updated })
}
