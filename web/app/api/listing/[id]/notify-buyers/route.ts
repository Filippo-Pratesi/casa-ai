import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/listing/[id]/notify-buyers — notify matching buyers
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // Get listing
  const { data: listing, error: listingErr } = await admin
    .from('listings')
    .select('address, city, price, rooms, sqm, property_type, workspace_id')
    .eq('id', id)
    .single()

  if (listingErr || !listing) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const l = listing as {
    address: string; city: string; price: number; rooms: number
    sqm: number; property_type: string; workspace_id: string
  }

  // Find matching buyer/renter contacts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contacts } = await (admin as any)
    .from('contacts')
    .select('id, name, agent_id, budget_max, preferred_cities, preferred_types, min_rooms, min_sqm')
    .eq('workspace_id', l.workspace_id)
    .in('type', ['buyer', 'renter'])

  type BuyerContact = {
    id: string; name: string; agent_id: string | null
    budget_max: number | null; preferred_cities: string[]
    preferred_types: string[]; min_rooms: number | null; min_sqm: number | null
  }

  const matching = ((contacts ?? []) as BuyerContact[]).filter(c => {
    if (c.budget_max !== null && c.budget_max < l.price) return false
    if ((c.preferred_cities ?? []).length > 0 && !(c.preferred_cities ?? []).map(s => s.toLowerCase()).includes(l.city.toLowerCase())) return false
    if ((c.preferred_types ?? []).length > 0 && !(c.preferred_types ?? []).includes(l.property_type)) return false
    if (c.min_rooms !== null && c.min_rooms > l.rooms) return false
    if (c.min_sqm !== null && c.min_sqm > l.sqm) return false
    return true
  })

  // Create a notification for each matching buyer's agent
  const notifications = matching
    .filter(c => c.agent_id)
    .map(c => ({
      workspace_id: l.workspace_id,
      agent_id: c.agent_id,
      type: 'buyer_match',
      title: 'Nuovo immobile compatibile',
      body: `${l.address} — compatibile con ${c.name}`,
      contact_id: c.id,
      read: false,
    }))

  if (notifications.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from('notifications').insert(notifications)
  }

  return NextResponse.json({ notified: notifications.length })
}
