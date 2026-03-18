import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/search?q=... — full-site search across listings, contacts
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

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
  if (!profile) return NextResponse.json({ results: [] })

  const pattern = `%${q}%`

  const [listingsRes, contactsRes] = await Promise.all([
    // Search listings by address or city
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('listings')
      .select('id, address, city, price, property_type')
      .eq('workspace_id', profile.workspace_id)
      .or(`address.ilike.${pattern},city.ilike.${pattern}`)
      .limit(5),

    // Search contacts by name, email or phone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contacts')
      .select('id, name, email, type')
      .eq('workspace_id', profile.workspace_id)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
  ])

  const listings = ((listingsRes.data ?? []) as Array<{ id: string; address: string; city: string; price: number; property_type: string }>)
    .map(l => ({
      type: 'listing' as const,
      id: l.id,
      label: `${l.address}, ${l.city}`,
      sub: `€${l.price.toLocaleString('it-IT')} · ${l.property_type}`,
      href: `/listing/${l.id}`,
    }))

  const contacts = ((contactsRes.data ?? []) as Array<{ id: string; name: string; email: string | null; type: string }>)
    .map(c => ({
      type: 'contact' as const,
      id: c.id,
      label: c.name,
      sub: c.email ?? c.type,
      href: `/contacts/${c.id}`,
    }))

  return NextResponse.json({ results: [...listings, ...contacts] })
}
