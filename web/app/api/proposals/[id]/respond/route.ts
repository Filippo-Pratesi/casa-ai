import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

const ACTION_LABELS: Record<string, string> = {
  accettata: 'accettata',
  rifiutata: 'rifiutata',
  ritirata: 'ritirata',
  inviata: 'inviata',
  controproposta: 'controproposta ricevuta',
}

// Map proposal action → contact_event type
const ACTION_TO_CONTACT_EVENT: Record<string, string | null> = {
  accettata: 'proposta_accettata',
  rifiutata: 'proposta_rifiutata',
  ritirata: 'proposta_ritirata',
  inviata: 'proposta_inviata',
  controproposta: 'controproposta_ricevuta',
}

// Map proposal action → property_event type (only relevant ones)
const ACTION_TO_PROPERTY_EVENT: Record<string, string | null> = {
  accettata: 'proposta_accettata',
  rifiutata: 'proposta_rifiutata',
  controproposta: null, // no matching property_event enum value
  ritirata: null,
  inviata: 'proposta_ricevuta',
}

// POST /api/proposals/[id]/respond
// body: { action: 'accettata' | 'rifiutata' | 'ritirata' | 'inviata' | 'controproposta' }
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id, role').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const allowed = ['accettata', 'rifiutata', 'ritirata', 'inviata', 'controproposta']
  if (!body.action || !allowed.includes(body.action)) {
    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('proposals')
    .select('status, agent_id, buyer_contact_id, listing_id, numero_proposta, immobile_indirizzo, immobile_citta, prezzo_offerto')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Proposta non trovata' }, { status: 404 })

  const isOwner = existing.agent_id === user.id
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('proposals')
    .update({ status: body.action, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, numero_proposta, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const action = body.action
  const immobileLabel = [existing.immobile_indirizzo, existing.immobile_citta].filter(Boolean).join(', ') || 'Immobile'
  const prezzoLabel = existing.prezzo_offerto ? ` — €${Number(existing.prezzo_offerto).toLocaleString('it-IT')}` : ''
  const propLabel = existing.numero_proposta ? ` (${existing.numero_proposta})` : ''

  // Auto-event: contact_event on buyer
  const contactEventType = ACTION_TO_CONTACT_EVENT[action]
  if (contactEventType && existing.buyer_contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('contact_events').insert({
      workspace_id: profile.workspace_id,
      contact_id: existing.buyer_contact_id,
      agent_id: user.id,
      event_type: contactEventType,
      title: `Proposta ${ACTION_LABELS[action]}${propLabel}: ${immobileLabel}${prezzoLabel}`,
      related_property_id: null, // resolved below if listing has property
    })
  }

  // Resolve property_id from listing (if listing exists and has a linked property)
  let propertyId: string | null = null
  if (existing.listing_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing } = await (admin as any)
      .from('listings')
      .select('property_id')
      .eq('id', existing.listing_id)
      .single()
    propertyId = listing?.property_id ?? null
  }

  // Auto-event: property_event on linked property
  const propertyEventType = ACTION_TO_PROPERTY_EVENT[action]
  if (propertyEventType && propertyId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('property_events').insert({
      workspace_id: profile.workspace_id,
      property_id: propertyId,
      agent_id: user.id,
      event_type: propertyEventType,
      title: `Proposta ${ACTION_LABELS[action]}${propLabel}${prezzoLabel}`,
      description: existing.buyer_contact_id ? `Acquirente collegato alla proposta` : null,
      sentiment: action === 'accettata' ? 'positive' : action === 'rifiutata' ? 'negative' : 'neutral',
      contact_id: existing.buyer_contact_id ?? null,
      metadata: { proposal_id: id, action, numero_proposta: existing.numero_proposta },
    })
  }

  return NextResponse.json(data)
}
