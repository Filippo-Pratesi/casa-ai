import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/banca-dati/search
// Query params: address, city, property_type, transaction_type,
//               price_min, price_max, rooms_min, sqm_min, stage
export async function GET(req: NextRequest) {
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

  const p = req.nextUrl.searchParams
  const address     = p.get('address')?.trim()
  const city        = p.get('city')?.trim()
  const propType    = p.get('property_type')?.trim()
  const txType      = p.get('transaction_type')?.trim()
  const priceMin    = p.get('price_min') ? Number(p.get('price_min')) : null
  const priceMax    = p.get('price_max') ? Number(p.get('price_max')) : null
  const roomsMin    = p.get('rooms_min') ? Number(p.get('rooms_min')) : null
  const sqmMin      = p.get('sqm_min')   ? Number(p.get('sqm_min'))   : null
  const stage       = p.get('stage')?.trim()

  let query = admin
    .from('properties')
    .select('id, address, city, zone, property_type, transaction_type, estimated_value, sqm, rooms, bathrooms, stage, condition')
    .eq('workspace_id', profile.workspace_id)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (address)   query = query.ilike('address', `%${address}%`)
  if (city)      query = query.ilike('city', `%${city}%`)
  if (propType)  query = query.eq('property_type', propType)
  if (txType)    query = query.eq('transaction_type', txType)
  if (priceMin)  query = query.gte('estimated_value', priceMin)
  if (priceMax)  query = query.lte('estimated_value', priceMax)
  if (roomsMin)  query = query.gte('rooms', roomsMin)
  if (sqmMin)    query = query.gte('sqm', sqmMin)
  if (stage)     query = query.eq('stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ properties: data ?? [] })
}
