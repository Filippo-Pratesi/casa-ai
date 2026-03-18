import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

// POST /api/listing/[id]/thankyou-email
// Generates an AI warm thank-you email for the buyer/renter of a sold/rented listing
// and saves it as a draft campaign.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, name')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; name: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wsData } = await (admin as any)
    .from('workspaces')
    .select('name')
    .eq('id', profile.workspace_id)
    .single()
  const workspaceName = (wsData as { name: string } | null)?.name ?? 'la nostra agenzia'

  const body = await req.json()
  const buyerName: string = typeof body.buyer_name === 'string' && body.buyer_name ? body.buyer_name : 'Cliente'
  const buyerContactId: string | null = typeof body.buyer_contact_id === 'string' ? body.buyer_contact_id : null
  const address: string = typeof body.address === 'string' ? body.address : ''
  const transactionType: 'sold' | 'rented' = body.transaction_type === 'rented' ? 'rented' : 'sold'

  // Resolve buyer email for campaign recipient filter
  let buyerEmail: string | null = null
  if (buyerContactId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactData } = await (admin as any)
      .from('contacts')
      .select('email')
      .eq('id', buyerContactId)
      .eq('workspace_id', profile.workspace_id)
      .single()
    buyerEmail = (contactData as { email: string | null } | null)?.email ?? null
  }

  // Also look in archived_contacts (buyer may have just been archived)
  if (!buyerEmail && buyerContactId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: archivedContact } = await (admin as any)
      .from('archived_contacts')
      .select('email')
      .eq('original_id', buyerContactId)
      .eq('workspace_id', profile.workspace_id)
      .single()
    buyerEmail = (archivedContact as { email: string | null } | null)?.email ?? null
  }

  const actionIT = transactionType === 'rented' ? 'affittato' : 'acquistato'
  const actionPast = transactionType === 'rented' ? 'locazione' : 'acquisto'

  const prompt = `Sei un agente immobiliare italiano esperto. Scrivi una email di ringraziamento calorosa e professionale per un cliente che ha appena ${actionIT} un immobile tramite la nostra agenzia.

Dettagli:
- Nome cliente: ${buyerName}
- Immobile: ${address || 'immobile'}
- Tipo transazione: ${actionPast}
- Nome agenzia: ${workspaceName}
- Nome agente: ${profile.name}

Scrivi:
1. Oggetto email (breve, max 60 caratteri)
2. Testo email in HTML con tag <p>, <strong>, <br> — tono caldo, personale, professionale. Max 200 parole. Includi un paragrafo di auguri, uno di disponibilità futura, e una firma con il nome dell'agente e dell'agenzia.

Rispondi SOLO in formato JSON con questa struttura esatta:
{"subject": "...", "body_html": "...", "body_text": "..."}`

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  const raw = result.response.text().trim()

  // Extract JSON from potential markdown code block
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw]
  const jsonStr = (jsonMatch[1] ?? raw).trim()

  let subject = `Grazie per il tuo ${actionPast} — ${workspaceName}`
  let bodyHtml = `<p>Gentile ${buyerName},</p><p>La ringraziamo per aver scelto ${workspaceName} per il suo ${actionPast}.</p><p>Rimaniamo a sua completa disposizione per qualsiasi esigenza futura.</p><p>Cordiali saluti,<br><strong>${profile.name}</strong><br>${workspaceName}</p>`
  let bodyText = `Gentile ${buyerName}, la ringraziamo per aver scelto ${workspaceName}. Cordiali saluti, ${profile.name}`

  try {
    const parsed = JSON.parse(jsonStr) as { subject?: string; body_html?: string; body_text?: string }
    if (parsed.subject) subject = parsed.subject
    if (parsed.body_html) bodyHtml = parsed.body_html
    if (parsed.body_text) bodyText = parsed.body_text
  } catch {
    // Use fallback values above
  }

  // Save as draft campaign
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData, error: insertError } = await (admin as any)
    .from('campaigns')
    .insert({
      workspace_id: profile.workspace_id,
      created_by: user.id,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      template: 'thankyou',
      recipient_filter: buyerEmail
        ? { type: 'specific_email', email: buyerEmail, name: buyerName }
        : { type: 'all' },
      status: 'draft',
    })
    .select('id')
    .single()

  if (insertError || !campaignData) {
    return NextResponse.json({ error: 'Errore nel salvataggio bozza' }, { status: 500 })
  }

  return NextResponse.json({
    campaign_id: (campaignData as { id: string }).id,
    subject,
    body_html: bodyHtml,
  })
}
