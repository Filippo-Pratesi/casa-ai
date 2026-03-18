import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

const SYSTEM_PROMPT = `Sei l'assistente AI di CasaAI, un'applicazione di gestione per agenti immobiliari italiani.

Le tue competenze:
- Diritto immobiliare italiano (rogiti, compromessi, contratti di locazione, caparre, provvigioni, DL 231/2007, catasto)
- Portali immobiliari italiani (Immobiliare.it, Idealista, Casa.it, Wikicasa) e pratiche di settore
- CRM CasaAI: gestione contatti, annunci, campagne email, calendario appuntamenti, archivio immobili venduti, targhette, to-do, MLS
- Marketing immobiliare: testi per annunci, social media, WhatsApp, email ai clienti
- Contrattualistica: proposta d'acquisto, preliminare di compravendita, contratto locazione (4+4, 3+2, transitorio, studenti), cedolare secca
- Fiscalità immobiliare: imposta di registro, IVA, imposte ipotecaria e catastale, agevolazioni prima casa, tassazione plusvalenze

Rispondi sempre in italiano, in modo conciso e pratico. Se l'utente chiede una bozza contrattuale o un testo formale, forniscila direttamente. Usa il Markdown per formattare le risposte (grassetto, liste, codice). Se non sei sicuro, dillo chiaramente.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, workspaces(plan)')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; workspaces: { plan: string } } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  const plan = profile.workspaces?.plan ?? 'trial'
  if (plan !== 'agenzia' && plan !== 'network') {
    return NextResponse.json({ error: 'Funzionalità disponibile per i piani Agenzia e Network' }, { status: 403 })
  }

  let body: { messages: ChatMessage[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }

  const messages = (body.messages ?? []).slice(-20) // keep last 20 messages for context

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI non configurata' }, { status: 500 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  let res: Response
  try {
    res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    return NextResponse.json({ error: `Errore AI: ${res.status}` }, { status: 500 })
  }

  const json = await res.json() as { choices: { message: { content: string } }[] }
  const reply = json.choices[0]?.message?.content ?? ''

  return NextResponse.json({ reply })
}
