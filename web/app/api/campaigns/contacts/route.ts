import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/campaigns/contacts — fetch contacts for campaign targeting
// Query params:
//   types      comma-separated list (buyer,seller,renter,landlord)
//   cities     comma-separated list
//   search     name / email / phone substring
//   listing_id mark previously contacted contacts with an asterisk
//   channel    email (default) | whatsapp — filters by email vs phone availability
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const typesParam = searchParams.get('types')
  const citiesParam = searchParams.get('cities')
  const search = searchParams.get('search')?.trim() ?? ''
  const listingId = searchParams.get('listing_id')
  const channel = searchParams.get('channel') ?? 'email'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('contacts')
    .select('id, name, email, phone, types, city_of_residence')
    .eq('workspace_id', profile.workspace_id)

  // Channel filter: require email or phone depending on channel
  if (channel === 'whatsapp') {
    query = query.not('phone', 'is', null).neq('phone', '')
  } else {
    query = query.not('email', 'is', null).neq('email', '')
  }

  // Type chips filter (any-of match against types[] array)
  if (typesParam) {
    const types = typesParam.split(',').filter(Boolean)
    if (types.length > 0) {
      query = query.overlaps('types', types)
    }
  }

  // City filter
  if (citiesParam) {
    const cities = citiesParam.split(',').filter(Boolean)
    if (cities.length === 1) {
      query = query.ilike('city_of_residence', `%${cities[0]}%`)
    } else if (cities.length > 1) {
      query = query.in('city_of_residence', cities)
    }
  }

  // Full-text search across name, email, phone
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  query = query.order('name', { ascending: true }).limit(200)

  const { data: contactsData } = await query
  const contacts = (contactsData ?? []) as {
    id: string
    name: string
    email: string | null
    phone: string | null
    types: string[]
    city_of_residence: string | null
  }[]

  // Mark contacts previously reached by a campaign for this listing
  let previouslyContactedIds = new Set<string>()
  if (listingId && contacts.length > 0) {
    const contactIds = contacts.map(c => c.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: eventsData } = await (admin as any)
      .from('contact_events')
      .select('contact_id')
      .eq('workspace_id', profile.workspace_id)
      .eq('event_type', 'immobile_proposto')
      .eq('related_listing_id', listingId)
      .in('contact_id', contactIds)
    if (eventsData) {
      previouslyContactedIds = new Set(
        (eventsData as { contact_id: string }[]).map(e => e.contact_id)
      )
    }
  }

  return NextResponse.json({
    contacts: contacts.map(c => ({
      ...c,
      previously_contacted: previouslyContactedIds.has(c.id),
    })),
  })
}
