import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/contacts — list workspace contacts
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const search = req.nextUrl.searchParams.get('q')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('contacts')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero contatti' }, { status: 500 })

  return NextResponse.json({ contacts: data ?? [] })
}

// POST /api/contacts — create contact
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 })

  const validTypes = ['buyer', 'seller', 'renter', 'landlord', 'other']
  // Support multi-type (types[]) with fallback to single type for backward compat
  const rawTypes = Array.isArray(body.types)
    ? (body.types as unknown[]).filter((t): t is string => typeof t === 'string' && validTypes.includes(t))
    : []
  const types = rawTypes.length > 0 ? rawTypes : [
    typeof body.type === 'string' && validTypes.includes(body.type) ? body.type : 'buyer'
  ]
  const type = types[0]

  const payload = {
    workspace_id: profile.workspace_id,
    agent_id: user.id,
    name,
    type,
    roles: types,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    city_of_residence: typeof body.city_of_residence === 'string' ? body.city_of_residence.trim() || null : null,
    address_of_residence: typeof body.address_of_residence === 'string' ? body.address_of_residence.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    budget_min: typeof body.budget_min === 'number' ? body.budget_min : null,
    budget_max: typeof body.budget_max === 'number' ? body.budget_max : null,
    preferred_cities: Array.isArray(body.preferred_cities) ? body.preferred_cities : [],
    preferred_types: Array.isArray(body.preferred_types) ? body.preferred_types : [],
    min_sqm: typeof body.min_sqm === 'number' ? body.min_sqm : null,
    min_rooms: typeof body.min_rooms === 'number' ? body.min_rooms : null,
    desired_features: Array.isArray(body.desired_features) ? body.desired_features : [],
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contacts')
    .insert(payload)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 })
}
