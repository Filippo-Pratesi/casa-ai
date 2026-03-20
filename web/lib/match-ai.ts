// Shared AI adjustment logic for match engine routes.

export interface MatchListingInput {
  address: string
  city: string
  price: number | null
  rooms: number | null
  sqm: number | null
  property_type: string | null
}

export interface MatchCandidate {
  contact_id: string
  name: string
  type: string
  score: number
}

export interface AIAdjustment {
  adjustment: number
  reason: string
}

export async function getAIAdjustments(
  apiKey: string,
  listing: MatchListingInput,
  candidates: MatchCandidate[]
): Promise<Record<string, AIAdjustment>> {
  const propertySummary = [
    `Indirizzo: ${listing.address}, ${listing.city}`,
    listing.property_type ? `Tipo: ${listing.property_type}` : null,
    listing.price ? `Prezzo: €${listing.price}` : null,
    listing.sqm ? `Mq: ${listing.sqm}` : null,
    listing.rooms ? `Locali: ${listing.rooms}` : null,
  ].filter(Boolean).join('; ')

  const candidatesText = candidates.map((c, i) =>
    `${i + 1}. ID=${c.contact_id} Nome=${c.name} Tipo=${c.type} ScoreDet=${c.score}`
  ).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

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
          {
            role: 'system',
            content: 'Sei un assistente immobiliare italiano. Analizza la compatibilità tra un annuncio e clienti. Rispondi solo con JSON valido.',
          },
          {
            role: 'user',
            content: `Annuncio: ${propertySummary}\n\nClienti (già filtrati, score deterministico incluso):\n${candidatesText}\n\nPer ogni cliente, fornisci un aggiustamento al punteggio deterministico (-10 a +20) e una motivazione di max 15 parole. Considera solo sfumature qualitative non catturate dai numeri.\nRispondi con JSON: {"adjustments": [{"contact_id": "...", "adjustment": 0, "reason": "max 15 parole"}]}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 400,
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`)

  const json = await res.json() as { choices: { message: { content: string } }[] }
  const parsed = JSON.parse(json.choices[0].message.content) as {
    adjustments?: Array<{ contact_id: string; adjustment: number; reason: string }>
  }

  const result: Record<string, AIAdjustment> = {}
  for (const a of parsed.adjustments ?? []) {
    result[a.contact_id] = {
      adjustment: Math.min(20, Math.max(-10, a.adjustment)),
      reason: a.reason,
    }
  }
  return result
}
