import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ id: string }> }

const VALID_ROLES = [
  'proprietario', 'moglie_marito', 'figlio_figlia', 'vicino', 'portiere',
  'amministratore', 'avvocato', 'commercialista', 'precedente_proprietario',
  'inquilino', 'altro',
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

// GET /api/properties/[id]/contacts — list property_contacts with contact details
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('property_contacts')
    .select('id, role, is_primary, notes, created_at, contacts(id, name, phone, email, type)')
    .eq('property_id', id)
    .eq('workspace_id', workspaceId)
    .order('is_primary', { ascending: false })

  if (error) return NextResponse.json({ error: 'Errore nel recupero contatti' }, { status: 500 })

  return NextResponse.json({ contacts: data ?? [] })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prop } = await (supabase as any)
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

    const validTypes = ['buyer', 'seller', 'renter', 'landlord', 'other']
    const contactType = typeof nc.type === 'string' && validTypes.includes(nc.type) ? nc.type : 'other'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newContact, error: createError } = await (supabase as any)
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        agent_id: user.id,
        name,
        type: contactType,
        phone: typeof nc.phone === 'string' ? nc.phone.trim() || null : null,
        email: typeof nc.email === 'string' ? nc.email.trim() || null : null,
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
    const { data: existingContact } = await (supabase as any)
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
  const { data: link, error: linkError } = await (supabase as any)
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

  return NextResponse.json({ id: (link as { id: string }).id }, { status: 201 })
}
