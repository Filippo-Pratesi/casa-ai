import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/banca-dati/match?property_id=...
// Reads pre-computed matches from match_results table (no AI calls on request)
export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get('property_id')
  if (!propertyId) return NextResponse.json({ error: 'property_id richiesto' }, { status: 400 })

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

  const { data: results } = await admin
    .from('match_results')
    .select('contact_id, deterministic_score, ai_adjustment, combined_score, ai_reason, computed_at, contacts(name, type)')
    .eq('workspace_id', profile.workspace_id)
    .eq('property_id', propertyId)
    .order('combined_score', { ascending: false })
    .limit(10)

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
