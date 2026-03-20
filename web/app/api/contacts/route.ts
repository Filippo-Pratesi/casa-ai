import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/contacts — list workspace contacts
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const search = req.nextUrl.searchParams.get('q')
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const perPage = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get('perPage') ?? '50', 10)))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) {
    const safe = search.replace(/['"();\\]/g, '').trim().slice(0, 100)
    const digits = safe.replace(/\D/g, '')
    if (digits.length >= 4) {
      // Digit-heavy query: search by name OR normalized phone
      query = query.or(`name.ilike.%${safe}%,phone_normalized.ilike.%${digits}%`)
    } else {
      // Generic query: search by name, phone, or email
      query = query.or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`)
    }
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: 'Errore nel recupero contatti' }, { status: 500 })

  return NextResponse.json({ contacts: data ?? [], total: count ?? 0, page, perPage })
}

// POST /api/contacts — create contact
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await createAdminClient()
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
    types: types,
    email: typeof body.email === 'string' ? body.email.trim() || null : null,
    phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
    city_of_residence: typeof body.city_of_residence === 'string' ? body.city_of_residence.trim() || null : null,
    address_of_residence: typeof body.address_of_residence === 'string' ? body.address_of_residence.trim() || null : null,
    notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    budget_min: typeof body.budget_min === 'number' ? body.budget_min : null,
    budget_max: typeof body.budget_max === 'number' ? body.budget_max : null,
    preferred_cities: Array.isArray(body.preferred_cities)
      ? (body.preferred_cities as unknown[]).filter((c): c is string => typeof c === 'string')
      : [],
    preferred_types: Array.isArray(body.preferred_types)
      ? (body.preferred_types as unknown[]).filter((t): t is string =>
          typeof t === 'string' && ['apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other'].includes(t)
        )
      : [],
    min_sqm: typeof body.min_sqm === 'number' ? body.min_sqm : null,
    min_rooms: typeof body.min_rooms === 'number' ? body.min_rooms : null,
    desired_features: Array.isArray(body.desired_features) ? body.desired_features : [],
    codice_fiscale: typeof body.codice_fiscale === 'string' ? body.codice_fiscale.trim() || null : null,
    partita_iva: typeof body.partita_iva === 'string' ? body.partita_iva.trim() || null : null,
    professione: typeof body.professione === 'string' ? body.professione.trim() || null : null,
    data_nascita: typeof body.data_nascita === 'string' ? body.data_nascita || null : null,
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
