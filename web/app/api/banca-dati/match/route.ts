import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Stages that use pre-computed match_results (calculated nightly)
const STORED_STAGES = ['conosciuto', 'incarico']
// Stages that compute on-demand without caching (ad-hoc, no AI)
const ADHOC_STAGES = ['sconosciuto']
// All others (ignoto, venduto, locato) → not_eligible

// GET /api/banca-dati/match?property_id=...
// Without ?ai=1 → stored stages: read from match_results DB; sconosciuto: compute on-demand
// With ?ai=1    → reads pre-computed AI results from match_results (listing/annuncio page)
export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('property_id')
  if (!propertyId) return NextResponse.json({ error: 'property_id richiesto' }, { status: 400 })

  const isAi = req.nextUrl.searchParams.get('ai') === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // --- AI mode: read pre-computed results from match_results ---
  if (isAi) {
    const { data: results } = await admin
      .from('match_results')
      .select('contact_id, deterministic_score, ai_adjustment, combined_score, ai_reason, computed_at, contacts(name, type)')
      .eq('workspace_id', profile.workspace_id)
      .eq('property_id', propertyId)
      .order('combined_score', { ascending: false })
      .limit(5)

    if (!results || results.length === 0) {
      return NextResponse.json({ matches: [], status: 'pending' })
    }

    const matches = (results as Array<{
      contact_id: string
      deterministic_score: number
      ai_adjustment: number
      combined_score: number
      ai_reason: string | null
      computed_at: string
      contacts: { name: string; type: string } | null
    }>).map(r => ({
      contact_id: r.contact_id,
      contact_name: r.contacts?.name ?? 'Sconosciuto',
      contact_type: r.contacts?.type ?? 'other',
      score: r.combined_score,
      deterministic_score: r.deterministic_score,
      ai_adjustment: r.ai_adjustment,
      reason: r.ai_reason ?? '',
      computed_at: r.computed_at,
    }))

    return NextResponse.json({ matches, status: 'ready' })
  }

  // --- Deterministic mode: banca dati page ---
  const { data: propData } = await admin
    .from('properties')
    .select('id, workspace_id, city, property_type, transaction_type, estimated_value, sqm, rooms, stage')
    .eq('id', propertyId)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!propData) return NextResponse.json({ error: 'Immobile non trovato' }, { status: 404 })

  const prop = propData as {
    id: string; workspace_id: string; city: string | null
    property_type: string | null; transaction_type: string | null
    estimated_value: number | null; sqm: number | null; rooms: number | null
    stage: string | null
  }

  const stage = prop.stage ?? ''

  // venduto, locato, ignoto → not eligible
  if (!STORED_STAGES.includes(stage) && !ADHOC_STAGES.includes(stage)) {
    return NextResponse.json({ matches: [], status: 'not_eligible', stage })
  }

  // conosciuto, incarico, disponibile → read pre-computed results from DB
  if (STORED_STAGES.includes(stage)) {
    const { data: results } = await admin
      .from('match_results')
      .select('contact_id, deterministic_score, ai_adjustment, combined_score, ai_reason, computed_at, contacts(name, type)')
      .eq('workspace_id', profile.workspace_id)
      .eq('property_id', propertyId)
      .order('combined_score', { ascending: false })
      .limit(5)

    if (!results || results.length === 0) {
      return NextResponse.json({ matches: [], status: 'pending' })
    }

    const matches = (results as Array<{
      contact_id: string; deterministic_score: number; ai_adjustment: number
      combined_score: number; ai_reason: string | null; computed_at: string
      contacts: { name: string; type: string } | null
    }>).map(r => ({
      contact_id: r.contact_id,
      contact_name: r.contacts?.name ?? 'Sconosciuto',
      contact_type: r.contacts?.type ?? 'other',
      score: r.combined_score,
      reason: r.ai_reason ?? '',
      computed_at: r.computed_at,
    }))

    return NextResponse.json({ matches, status: 'ready' })
  }

  // sconosciuto → compute on-demand, no caching, no AI
  if (!prop.city) {
    return NextResponse.json({ matches: [], status: 'ready' })
  }

  const contactTypes: string[] = []
  if (!prop.transaction_type || prop.transaction_type === 'vendita') contactTypes.push('buyer')
  if (!prop.transaction_type || prop.transaction_type === 'affitto') contactTypes.push('renter')

  let allMatches: Array<{ contact_id: string; contact_name: string; contact_type: string; score: number }> = []

  for (const contactType of contactTypes) {
    const { data: scored } = await admin.rpc('score_contacts_for_listing', {
      p_workspace_id: prop.workspace_id,
      p_city: prop.city,
      p_price: prop.estimated_value ?? 0,
      p_property_type: prop.property_type,
      p_rooms: prop.rooms,
      p_sqm: prop.sqm,
      p_contact_type: contactType,
    })

    if (scored) {
      allMatches = allMatches.concat(
        (scored as Array<{ id: string; name: string; score: number }>).map(s => ({
          contact_id: s.id,
          contact_name: s.name,
          contact_type: contactType,
          score: s.score,
        }))
      )
    }
  }

  allMatches.sort((a, b) => b.score - a.score)
  const top5 = allMatches.slice(0, 5).filter(m => m.score >= 30)

  const matches = top5.map(m => ({
    contact_id: m.contact_id,
    contact_name: m.contact_name,
    contact_type: m.contact_type,
    score: m.score,
    reason: '',
    computed_at: new Date().toISOString(),
  }))

  return NextResponse.json({ matches, status: 'ready' })
}
