import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const startedAt = new Date()
  let propertiesProcessed = 0
  let matchesCreated = 0
  let aiCallsMade = 0

  try {
    // Find all published listings with match_stale = true
    const { data: staleListings } = await admin
      .from('listings')
      .select('id, property_id, workspace_id, address, city, price, rooms, sqm, property_type')
      .eq('status', 'published')
      .eq('match_stale', true)
      .limit(100) // Process max 100 per cron run

    if (!staleListings || staleListings.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nessun annuncio da aggiornare' })
    }

    for (const listing of staleListings) {
      try {
        const result = await computeMatchesForListing(admin, listing)
        propertiesProcessed++
        matchesCreated += result.matchesUpserted
        aiCallsMade += result.aiCalls

        // Mark listing as not stale
        await admin
          .from('listings')
          .update({ match_stale: false })
          .eq('id', listing.id)
      } catch (err) {
        console.error(`Errore elaborazione listing ${listing.id}:`, err)
      }
    }

    const completedAt = new Date()
    await admin.from('match_computation_log').insert({
      properties_processed: propertiesProcessed,
      matches_created: matchesCreated,
      ai_calls_made: aiCallsMade,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      trigger_type: 'cron',
    })

    return NextResponse.json({ processed: propertiesProcessed, matches: matchesCreated })
  } catch (err) {
    console.error('Match engine compute error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

interface ListingRow {
  id: string
  property_id: string | null
  workspace_id: string
  address: string
  city: string
  price: number | null
  rooms: number | null
  sqm: number | null
  property_type: string | null
}

async function computeMatchesForListing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  listing: ListingRow
): Promise<{ matchesUpserted: number; aiCalls: number }> {
  const price = listing.price ?? 0
  const city = listing.city

  const contactTypes = ['buyer', 'renter']
  let allMatches: Array<{ contact_id: string; name: string; type: string; score: number }> = []

  for (const contactType of contactTypes) {
    const { data: scored } = await admin.rpc('score_contacts_for_listing', {
      p_workspace_id: listing.workspace_id,
      p_city: city,
      p_price: price,
      p_property_type: listing.property_type,
      p_rooms: listing.rooms,
      p_sqm: listing.sqm,
      p_contact_type: contactType,
    })

    if (scored) {
      allMatches = allMatches.concat(
        scored.map((s: { id: string; name: string; score: number }) => ({
          contact_id: s.id,
          name: s.name,
          type: contactType,
          score: s.score,
        }))
      )
    }
  }

  // Sort and take top 5 with minimum score 30
  allMatches.sort((a, b) => b.score - a.score)
  const top5 = allMatches.slice(0, 5).filter(m => m.score >= 30)

  if (top5.length === 0) return { matchesUpserted: 0, aiCalls: 0 }

  // AI enhancement via DeepSeek
  let aiAdjustments: Record<string, { adjustment: number; reason: string }> = {}
  let aiCalls = 0

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (apiKey && top5.length > 0) {
    try {
      const adjustments = await getAIAdjustments(apiKey, listing, top5)
      aiAdjustments = adjustments
      aiCalls = 1
    } catch (err) {
      console.error('AI adjustment fallito, uso punteggi deterministici:', err)
    }
  }

  // Upsert match_results
  const propertyId = listing.property_id ?? listing.id
  const rows = top5.map(m => {
    const adj = aiAdjustments[m.contact_id]
    const aiAdj = adj?.adjustment ?? 0
    const combined = Math.min(100, Math.max(0, m.score + aiAdj))
    return {
      workspace_id: listing.workspace_id,
      property_id: propertyId,
      contact_id: m.contact_id,
      deterministic_score: m.score,
      ai_adjustment: aiAdj,
      combined_score: combined,
      ai_reason: adj?.reason ?? null,
      computed_at: new Date().toISOString(),
      stale: false,
    }
  })

  await admin
    .from('match_results')
    .upsert(rows, { onConflict: 'workspace_id,property_id,contact_id' })

  return { matchesUpserted: rows.length, aiCalls }
}

async function getAIAdjustments(
  apiKey: string,
  listing: ListingRow,
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

  const result: Record<string, { adjustment: number; reason: string }> = {}
  for (const a of parsed.adjustments ?? []) {
    result[a.contact_id] = {
      adjustment: Math.min(20, Math.max(-10, a.adjustment)),
      reason: a.reason,
    }
  }
  return result
}
