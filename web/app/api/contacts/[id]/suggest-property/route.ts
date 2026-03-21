import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

// GET /api/contacts/[id]/suggest-property
// Returns: { suggestedPropertyIds: string[] }
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const { data } = await admin
    .from('property_suggestions')
    .select('property_id')
    .eq('contact_id', id)
    .eq('workspace_id', profile.workspace_id)

  const ids = ((data ?? []) as { property_id: string }[]).map(r => r.property_id)
  return NextResponse.json({ suggestedPropertyIds: ids })
}

// POST /api/contacts/[id]/suggest-property
// Body: { property_id, method, message }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profileData } = await admin.from('users').select('workspace_id, name, email').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string; name: string; email: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const body = await req.json() as { property_id?: string; method?: string; message?: string }
  const { property_id, method, message } = body

  if (!property_id || !method || !message) {
    return NextResponse.json({ error: 'property_id, method e message sono obbligatori' }, { status: 400 })
  }
  if (!['email', 'whatsapp'].includes(method)) {
    return NextResponse.json({ error: 'method deve essere email o whatsapp' }, { status: 400 })
  }

  // Verify contact belongs to workspace
  const { data: contactData } = await admin
    .from('contacts')
    .select('id, name, email, phone')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!contactData) return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })
  const contact = contactData as { id: string; name: string; email: string | null; phone: string | null }

  // Verify property belongs to workspace
  const { data: propData } = await admin
    .from('properties')
    .select('id, address, city')
    .eq('id', property_id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!propData) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  const prop = propData as { id: string; address: string; city: string }

  // Send email via Resend if method === 'email'
  if (method === 'email') {
    if (!contact.email) {
      return NextResponse.json({ error: 'Il contatto non ha un indirizzo email' }, { status: 400 })
    }
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email non configurata' }, { status: 500 })

    const resend = new Resend(resendKey)
    const { error: emailError } = await resend.emails.send({
      from: 'Casa AI <noreply@casa-ai.it>',
      to: contact.email,
      subject: `Immobile proposto: ${prop.address}, ${prop.city}`,
      text: message,
      html: `<pre style="font-family:sans-serif;white-space:pre-wrap;max-width:600px">${message}</pre>`,
    })
    if (emailError) {
      return NextResponse.json({ error: `Errore invio email: ${emailError.message}` }, { status: 500 })
    }
  }
  // For whatsapp: client opens wa.me link directly — no server action needed

  // Record the suggestion
  await admin.from('property_suggestions').insert({
    workspace_id: profile.workspace_id,
    contact_id: id,
    property_id,
    method,
    message,
    agent_id: user.id,
  })

  // Add a contact event for cronistoria
  await admin.from('contact_events').insert({
    workspace_id: profile.workspace_id,
    contact_id: id,
    agent_id: user.id,
    event_type: 'immobile_proposto',
    title: `Immobile proposto via ${method === 'email' ? 'Email' : 'WhatsApp'}`,
    body: `${prop.address}, ${prop.city}\n\n${message}`,
    event_date: new Date().toISOString(),
    related_property_id: property_id,
  })

  return NextResponse.json({ ok: true })
}
