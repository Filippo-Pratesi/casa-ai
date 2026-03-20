import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/match-engine/trigger
// Body: { property_id: string }
// Immediately computes deterministic matches for a published listing linked to property_id.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json() as { property_id?: string }
  const { property_id } = body
  if (!property_id) return NextResponse.json({ error: 'property_id richiesto' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Get workspace for this user
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  if (!profileData) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  const profile = profileData as { workspace_id: string }

  // Find the listing for this property (must be published)
  const { data: listing } = await admin
    .from('listings')
    .select('id, property_id, workspace_id, address, city, price, rooms, sqm, property_type')
    .eq('property_id', property_id)
    .eq('workspace_id', profile.workspace_id)
    .eq('status', 'published')
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Annuncio pubblicato non trovato per questo immobile' }, { status: 404 })
  }

  // Run deterministic scoring immediately
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

  if (top5.length > 0) {
    const rows = top5.map(m => ({
      workspace_id: listing.workspace_id,
      property_id: property_id,
      contact_id: m.contact_id,
      deterministic_score: m.score,
      ai_adjustment: 0,
      combined_score: m.score,
      computed_at: new Date().toISOString(),
      stale: false,
    }))

    await admin
      .from('match_results')
      .upsert(rows, { onConflict: 'workspace_id,property_id,contact_id' })
  }

  // Mark listing as fresh
  await admin
    .from('listings')
    .update({ match_stale: false })
    .eq('id', listing.id)

  return NextResponse.json({ success: true, matches: top5.length })
}
