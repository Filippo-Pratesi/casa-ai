import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/match-engine/trigger
// Body: { property_id: string }
// Computes deterministic + AI matches for a published listing linked to property_id.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json() as { property_id?: string }
  const { property_id } = body
  if (!property_id) return NextResponse.json({ error: 'property_id richiesto' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  if (!profileData) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  const profile = profileData as { workspace_id: string }

  // Find the listing for this property (any status — manual trigger works for draft too)
  const { data: listing } = await admin
    .from('listings')
    .select('id, property_id, workspace_id, address, city, price, rooms, sqm, property_type')
    .eq('property_id', property_id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Annuncio non trovato per questo immobile' }, { status: 404 })
  }

  // Step 1: Deterministic scoring
  const contactTypes = ['buyer', 'renter']
  let allMatches: Array<{ contact_id: string; name: string; type: string; score: number }> = []

  for (const contactType of contactTypes) {
    const { data: scored } = await admin.rpc('score_contacts_for_listing', {
      p_workspace_id: listing.workspace_id,
      p_city: listing.city,
      p_price: listing.price ?? 0,
      p_property_type: listing.property_type,
      p_rooms: listing.rooms,
      p_sqm: listing.sqm,
      p_contact_type: contactType,
    })
    if (scored) {
      allMatches = allMatches.concat(
        (scored as Array<{ id: string; name: string; score: number }>).map(s => ({
          contact_id: s.id,
          name: s.name,
          type: contactType,
          score: s.score,
        }))
      )
    }
  }

  allMatches.sort((a, b) => b.score - a.score)
  const top5 = allMatches.slice(0, 5).filter(m => m.score >= 30)

  if (top5.length === 0) {
    await admin.from('listings').update({ match_stale: false }).eq('id', listing.id)
    return NextResponse.json({ success: true, matches: 0 })
  }

  // Step 2: AI adjustment via DeepSeek
  let aiAdjustments: Record<string, { adjustment: number; reason: string }> = {}
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (apiKey) {
    try {
      aiAdjustments = await getAIAdjustments(apiKey, listing, top5)
    } catch (err) {
      console.error('AI adjustment fallito, uso punteggi deterministici:', err)
    }
  }

  // Step 3: Upsert with AI results
  const rows = top5.map(m => {
    const adj = aiAdjustments[m.contact_id]
    const aiAdj = adj?.adjustment ?? 0
    return {
      workspace_id: listing.workspace_id,
      property_id: property_id,
      contact_id: m.contact_id,
      deterministic_score: m.score,
      ai_adjustment: aiAdj,
      combined_score: Math.min(100, Math.max(0, m.score + aiAdj)),
      ai_reason: adj?.reason ?? null,
      computed_at: new Date().toISOString(),
      stale: false,
    }
  })

  await admin
    .from('match_results')
    .upsert(rows, { onConflict: 'workspace_id,property_id,contact_id' })

  await admin.from('listings').update({ match_stale: false }).eq('id', listing.id)

  return NextResponse.json({ success: true, matches: rows.length })
}

async function getAIAdjustments(
  apiKey: string,
  listing: { address: string; city: string; price: number | null; rooms: number | null; sqm: number | null; property_type: string | null },
  candidates: Array<{ contact_id: string; name: string; type: string; score: number }>
): Promise<Record<string, { adjustment: number; reason: string }>> {
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
            content: `Annuncio: ${propertySummary}\n\nClienti (score deterministico incluso):\n${candidatesText}\n\nPer ogni cliente fornisci un aggiustamento al punteggio (-10 a +20) e motivazione max 15 parole.\nRispondi con JSON: {"adjustments": [{"contact_id": "...", "adjustment": 0, "reason": "..."}]}`,
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

  const result: Record<string, { adjustment: number; reason: string }> = {}
  for (const a of parsed.adjustments ?? []) {
    result[a.contact_id] = {
      adjustment: Math.min(20, Math.max(-10, a.adjustment)),
      reason: a.reason,
    }
  }
  return result
}
