import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_ROLES = [
  'proprietario', 'venditore', 'acquirente',
  'moglie_marito', 'figlio_figlia', 'vicino', 'portiere',
  'amministratore', 'avvocato', 'commercialista', 'precedente_proprietario',
  'inquilino', 'altro',
]

// Derive contact type from role (used when creating a new contact)
function contactTypeFromRole(role: string): string {
  if (['proprietario', 'venditore'].includes(role)) return 'seller'
  if (role === 'acquirente') return 'buyer'
  if (role === 'inquilino') return 'renter'
  return 'other'
}

async function getWorkspaceId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

// GET /api/properties/[id]/contacts — list property_contacts with contact details
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (adminClient as any)
    .from('property_contacts')
    .select('id, role, is_primary, notes, created_at, contact:contacts(id, name, phone, email, type, types)')
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)
    .order('is_primary', { ascending: false })

  if (error) return NextResponse.json({ error: 'Errore nel recupero contatti' }, { status: 500 })

  // Deduplicate server-side: keep only one row per (contact_id, role) combination
  type RawRow = { id: string; role: string; is_primary: boolean; notes: string | null; created_at: string; contact: { id: string } | null }
  const seen = new Set<string>()
  const deduped = (data as RawRow[] ?? []).filter(row => {
    const key = `${row.contact?.id ?? row.id}::${row.role}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ contacts: deduped })
}

// POST /api/properties/[id]/contacts — associate or create+associate a contact
export async function POST(req: NextRequest, { params }: RouteContext) {
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

  const role = typeof body.role === 'string' ? body.role : ''
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
  }

  // Verify property belongs to workspace
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prop } = await (admin as any)
    .from('properties')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!prop) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  let contactId: string

  if (body.new_contact && typeof body.new_contact === 'object') {
    // Create new contact then link
    const nc = body.new_contact as Record<string, unknown>
    const name = typeof nc.name === 'string' ? nc.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Il nome del contatto è obbligatorio' }, { status: 400 })

    // Derive type from role if not explicitly provided
    const validTypes = ['buyer', 'seller', 'renter', 'landlord', 'other']
    const contactType = typeof nc.type === 'string' && validTypes.includes(nc.type)
      ? nc.type
      : contactTypeFromRole(role)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newContact, error: createError } = await (admin as any)
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        agent_id: user.id,
        name,
        type: contactType,
        types: [contactType],
        phone: typeof nc.phone === 'string' ? nc.phone.trim() || null : null,
        email: typeof nc.email === 'string' ? nc.email.trim() || null : null,
        city_of_residence: typeof nc.city_of_residence === 'string' ? nc.city_of_residence.trim() || null : null,
        address_of_residence: typeof nc.address_of_residence === 'string' ? nc.address_of_residence.trim() || null : null,
      })
      .select('id')
      .single()

    if (createError || !newContact) {
      return NextResponse.json({ error: 'Errore nella creazione del contatto' }, { status: 500 })
    }
    contactId = (newContact as { id: string }).id
  } else if (typeof body.contact_id === 'string') {
    contactId = body.contact_id
    // Verify the contact belongs to the workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingContact } = await (admin as any)
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existingContact) {
      return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })
    }
  } else {
    return NextResponse.json({ error: 'È necessario specificare un contatto o crearne uno nuovo' }, { status: 400 })
  }

  const linkPayload = {
    workspace_id: workspaceId,
    property_id: id,
    contact_id: contactId,
    role,
    is_primary: body.is_primary === true,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link, error: linkError } = await (admin as any)
    .from('property_contacts')
    .insert(linkPayload)
    .select('id')
    .single()

  if (linkError) {
    if (linkError.code === '23505') {
      return NextResponse.json({ error: 'Questo contatto ha già questo ruolo per l\'immobile' }, { status: 409 })
    }
    return NextResponse.json({ error: "Errore nell'associazione del contatto" }, { status: 500 })
  }

  // If role is 'proprietario' and property has no owner yet, set owner_contact_id
  if (role === 'proprietario') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentProp } = await (admin as any)
      .from('properties')
      .select('owner_contact_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()
    if (!(currentProp as { owner_contact_id: string | null } | null)?.owner_contact_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('properties')
        .update({ owner_contact_id: contactId })
        .eq('id', id)
        .eq('workspace_id', workspaceId)
    }
  }

  // Auto-event: contact added
  const ROLE_IT: Record<string, string> = {
    proprietario: 'Proprietario', moglie_marito: 'Moglie/Marito', figlio_figlia: 'Figlio/Figlia',
    vicino: 'Vicino', portiere: 'Portiere', amministratore: 'Amministratore',
    avvocato: 'Avvocato', commercialista: 'Commercialista',
    precedente_proprietario: 'Ex proprietario', inquilino: 'Inquilino', altro: 'Altro',
  }
  // Resolve contact name for the event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactRow } = await (admin as any)
    .from('contacts').select('name').eq('id', contactId).single()
  const contactName = (contactRow as { name?: string } | null)?.name ?? 'Contatto'
  // Auto-event: contact added to property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('property_events').insert({
    workspace_id: workspaceId,
    property_id: id,
    agent_id: user.id,
    event_type: 'contatto_aggiunto',
    title: `${contactName} aggiunto come ${ROLE_IT[role] ?? role}`,
  })

  // Auto-event: property linked to contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propertyData } = await (admin as any)
    .from('properties')
    .select('address, city')
    .eq('id', id)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('contact_events').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    agent_id: user.id,
    event_type: 'immobile_collegato',
    title: `Immobile collegato: ${(propertyData as { address?: string; city?: string } | null)?.address ?? 'Indirizzo sconosciuto'}, ${(propertyData as { address?: string; city?: string } | null)?.city ?? ''}`,
    related_property_id: id,
  })

  return NextResponse.json({ id: (link as { id: string }).id, contact_id: contactId }, { status: 201 })
}
