import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Contact {
  id: string
  name: string
  agent_id: string | null
  workspace_id: string
  date_of_birth: string | null
}

async function generateBirthdayMessage(contactName: string): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY non configurata')

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Sei un assistente per agenti immobiliari italiani. Scrivi messaggi brevi, caldi e professionali.',
        },
        {
          role: 'user',
          content: `Scrivi un breve messaggio di auguri di compleanno per il cliente "${contactName}". Il messaggio deve essere caldo, personale e professionale. Deve sembrare scritto da un agente immobiliare che ha un buon rapporto con il cliente. Massimo 3-4 righe. Non usare emoji eccessivi. Non includere intestazioni o firme — solo il testo del messaggio.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.8,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${err}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content?.trim() ?? ''
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // Get profile
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // Get contact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactData, error } = await (admin as any)
    .from('contacts')
    .select('id, name, agent_id, workspace_id, date_of_birth')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (error || !contactData) {
    return NextResponse.json({ error: 'Contatto non trovato' }, { status: 404 })
  }

  const contact = contactData as Contact

  try {
    const message = await generateBirthdayMessage(contact.name)

    // Determine target agent: use contact's agent_id or fall back to current user
    const targetAgentId = contact.agent_id ?? user.id

    // Create notification for the agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('notifications')
      .insert({
        workspace_id: profile.workspace_id,
        agent_id: targetAgentId,
        type: 'birthday_message',
        title: `Messaggio di compleanno per ${contact.name}`,
        body: message,
        contact_id: contact.id,
      })

    return NextResponse.json({ message })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
