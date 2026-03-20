import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAIAdjustments } from '@/lib/match-ai'
import { rateLimit } from '@/lib/rate-limit'

// POST /api/match-engine/trigger
// Body: { property_id: string }
// Computes deterministic + AI matches for a published listing linked to property_id.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const rl = rateLimit(`match-engine:${user.id}`, { limit: 20, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppe richieste. Riprova tra poco.' }, { status: 429 })
  }

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

  // Fetch property stage — AI only for incarico
  const { data: propData } = await admin
    .from('properties')
    .select('stage')
    .eq('id', property_id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  const propertyStage: string = (propData as { stage: string } | null)?.stage ?? ''

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

  // Step 2: AI adjustment via DeepSeek — only for incarico stage
  let aiAdjustments: Record<string, { adjustment: number; reason: string }> = {}
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (apiKey && propertyStage === 'incarico') {
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

