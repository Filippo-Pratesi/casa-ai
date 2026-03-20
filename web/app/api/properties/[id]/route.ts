import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

const ALLOWED_PATCH_FIELDS = [
  'address', 'city', 'zone', 'sub_zone', 'latitude', 'longitude',
  'doorbell', 'building_notes', 'property_type', 'floor', 'total_floors',
  'sqm', 'rooms', 'bathrooms', 'condition', 'features', 'estimated_value',
  'transaction_type', 'owner_contact_id',
  'foglio', 'particella', 'subalterno', 'categoria_catastale', 'rendita_catastale',
  'incarico_type', 'incarico_date', 'incarico_expiry',
  'incarico_commission_percent', 'incarico_notes',
  'lease_type', 'lease_start_date', 'lease_end_date', 'monthly_rent',
  'monthly_rent_discounted', 'discount_notes', 'deposit',
  'tenant_contact_id', 'lease_notes',
  'labels', 'owner_disposition',
]

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// GET /api/properties/[id] — fetch single property with relations
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property, error } = await (supabase as any)
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  // Fetch property_contacts with nested contact details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (supabase as any)
    .from('property_contacts')
    .select('id, role, is_primary, notes, contact_id, contacts(id, name, phone, email)')
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)

  // Fetch last 5 events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: events } = await (supabase as any)
    .from('property_events')
    .select('*')
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)
    .order('event_date', { ascending: false })
    .limit(5)

  return NextResponse.json({
    property: {
      ...property,
      property_contacts: contacts ?? [],
      recent_events: events ?? [],
    },
  })
}

// PATCH /api/properties/[id] — partial update
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  // Only allow permitted fields
  const update: Record<string, unknown> = {}
  for (const field of ALLOWED_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field] ?? null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Fetch current property to detect changes for events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentProp } = await (admin as any)
    .from('properties')
    .select('owner_disposition, incarico_date, stage, owner_contact_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  const oldDisposition = (currentProp as { owner_disposition?: string } | null)?.owner_disposition ?? null
  const oldIncaricDate = (currentProp as { incarico_date?: string } | null)?.incarico_date ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('properties')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error || !data) return NextResponse.json({ error: "Errore nell'aggiornamento immobile" }, { status: 500 })

  // Auto-event: disposition change
  if ('owner_disposition' in update && update.owner_disposition !== oldDisposition) {
    const DISP_IT: Record<string, string> = {
      non_definito: 'Non definito', vende: 'Vuole vendere', non_vende: 'Non vuole vendere',
      forse: 'In dubbio', aspetta_prezzo: 'Aspetta prezzo giusto',
      incarico_firmato: 'Incarico firmato', appena_acquistato: 'Appena acquistato',
    }
    const oldLabel = DISP_IT[oldDisposition ?? ''] ?? oldDisposition ?? '—'
    const newLabel = DISP_IT[update.owner_disposition as string] ?? update.owner_disposition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('property_events').insert({
      workspace_id: workspaceId,
      property_id: id,
      agent_id: user.id,
      event_type: 'cambio_disposizione',
      title: `Stato proprietario: ${oldLabel} → ${newLabel}`,
    })
  }

  // Auto-event: incarico signed (new incarico_date set and owner contact exists)
  if ('incarico_date' in update && update.incarico_date && !oldIncaricDate && data.owner_contact_id) {
    const ownerContactId = data.owner_contact_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactRow } = await (admin as any)
      .from('contacts')
      .select('name')
      .eq('id', ownerContactId)
      .single()
    const contactName = (contactRow as { name?: string } | null)?.name ?? 'Proprietario'

    // Auto-event in contact_events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('contact_events').insert({
      workspace_id: workspaceId,
      contact_id: ownerContactId,
      agent_id: user.id,
      event_type: 'incarico_firmato',
      title: `Incarico firmato per: ${data.address ?? 'Indirizzo sconosciuto'}`,
      related_property_id: id,
    })
  }

  return NextResponse.json({ property: data })
}

// DELETE /api/properties/[id] — delete (only if sconosciuto or ignoto)
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Check stage before deleting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: property } = await (supabase as any)
    .from('properties')
    .select('stage')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!property) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  const stage = (property as { stage: string }).stage
  if (!['sconosciuto', 'ignoto'].includes(stage)) {
    return NextResponse.json(
      { error: 'Impossibile eliminare un immobile in fase avanzata' },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('properties')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return NextResponse.json({ error: "Errore nell'eliminazione immobile" }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
