import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// In-memory cache: key = `${workspaceId}:${propertyId}`, value = { ts, matches }
// TTL = 30 minutes — avoids re-calling DeepSeek on every page load
const CACHE = new Map<string, { ts: number; matches: MatchResult[] }>()
const CACHE_TTL_MS = 30 * 60 * 1000

export interface MatchResult {
  contact_id: string
  contact_name: string
  contact_type: string
  score: number        // 0-100
  reason: string
}

// GET /api/banca-dati/match?property_id=...
export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('property_id')
  if (!propertyId) return NextResponse.json({ error: 'property_id richiesto' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const cacheKey = `${profile.workspace_id}:${propertyId}`
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ matches: cached.matches, cached: true })
  }

  // Fetch property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propData } = await (admin as any)
    .from('properties')
    .select('id, address, city, zone, property_type, transaction_type, estimated_value, sqm, rooms')
    .eq('id', propertyId)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!propData) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prop = propData as any

  // Fetch potential buyers/renters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData } = await (admin as any)
    .from('contacts')
    .select('id, name, type, budget_min, budget_max, preferred_cities, min_rooms')
    .eq('workspace_id', profile.workspace_id)
    .in('type', ['buyer', 'renter'])
    .limit(40)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts = (contactsData ?? []) as any[]
  if (contacts.length === 0) {
    return NextResponse.json({ matches: [], cached: false })
  }

  // Build compact summary for DeepSeek (minimize tokens)
  const propertySummary = [
    `Indirizzo: ${prop.address}, ${prop.city}${prop.zone ? ` (${prop.zone})` : ''}`,
    prop.property_type ? `Tipo: ${prop.property_type}` : null,
    prop.transaction_type ? `Operazione: ${prop.transaction_type}` : null,
    prop.estimated_value ? `Prezzo: €${prop.estimated_value}` : null,
    prop.sqm ? `Mq: ${prop.sqm}` : null,
    prop.rooms ? `Locali: ${prop.rooms}` : null,
  ].filter(Boolean).join('; ')

  const contactsSummary = contacts.map((c, i) =>
    [
      `${i + 1}. ID=${c.id} Nome=${c.name} Tipo=${c.type}`,
      c.budget_max ? `Budget≤€${c.budget_max}` : null,
      c.preferred_cities?.length ? `Città=${c.preferred_cities.join('/')}` : null,
      c.min_rooms ? `MinLocali=${c.min_rooms}` : null,
    ].filter(Boolean).join(' ')
  ).join('\n')

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'DeepSeek non configurato' }, { status: 500 })

  const systemPrompt = `Sei un assistente immobiliare italiano. Analizza la compatibilità tra un immobile e una lista di clienti. Rispondi solo con JSON valido.`
  const userMessage = `Immobile: ${propertySummary}

Clienti interessati:
${contactsSummary}

Per ogni cliente valuta la compatibilità con l'immobile. Considera: budget, città preferite, locali minimi.
Rispondi con JSON: {"matches": [{"contact_id": "id", "score": 0-100, "reason": "max 15 parole"}]}
Includi solo i clienti con score >= 40. Max 5 risultati, ordinati per score decrescente.`

  let matches: MatchResult[] = []
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    let res: Response
    try {
      res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 500,
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) throw new Error(`DeepSeek error ${res.status}`)
    const json = await res.json() as { choices: { message: { content: string } }[] }
    const parsed = JSON.parse(json.choices[0].message.content) as { matches?: { contact_id: string; score: number; reason: string }[] }

    // Enrich with contact names/type from our fetched list
    const contactMap = new Map(contacts.map((c: { id: string; name: string; type: string }) => [c.id, c]))
    matches = (parsed.matches ?? [])
      .filter(m => contactMap.has(m.contact_id))
      .map(m => {
        const c = contactMap.get(m.contact_id)!
        return { contact_id: m.contact_id, contact_name: c.name, contact_type: c.type, score: m.score, reason: m.reason }
      })
  } catch {
    return NextResponse.json({ error: 'Errore AI match engine' }, { status: 500 })
  }

  CACHE.set(cacheKey, { ts: Date.now(), matches })
  return NextResponse.json({ matches, cached: false })
}
