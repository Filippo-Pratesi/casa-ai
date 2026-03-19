import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BancaDatiClient } from '@/components/banca-dati/banca-dati-client'

export const metadata = { title: 'Banca Dati — CasaAI' }

interface Property {
  id: string
  address: string
  city: string
  zone: string | null
  sub_zone: string | null
  stage: string
  owner_disposition: string
  transaction_type: string | null
  property_type: string | null
  sqm: number | null
  rooms: number | null
  estimated_value: number | null
  updated_at: string
  owner_name: string | null
  agent_name: string | null
  last_event: { event_type: string; title: string; event_date: string } | null
}

export default async function BancaDatiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile) redirect('/auth/setup')

  const params = await searchParams
  const stage = params.stage ?? ''
  const city = params.city ?? ''
  const zone = params.zone ?? ''
  const agent_id = params.agent_id ?? ''
  const disposition = params.disposition ?? ''
  const transaction_type = params.transaction_type ?? ''
  const q = params.q ?? ''
  const street = params.street ?? ''
  const civic = params.civic ?? ''
  const page = parseInt(params.page ?? '1', 10)
  const sort = params.sort ?? 'updated_at_desc'
  const viewMode = params.viewMode ?? 'list'
  const per_page = 50

  const SORT_MAP: Record<string, { col: string; asc: boolean }> = {
    updated_at_desc: { col: 'updated_at', asc: false },
    updated_at_asc:  { col: 'updated_at', asc: true },
    city_asc:        { col: 'city', asc: true },
    city_desc:       { col: 'city', asc: false },
    value_desc:      { col: 'estimated_value', asc: false },
    value_asc:       { col: 'estimated_value', asc: true },
  }
  const sortOpt = SORT_MAP[sort] ?? SORT_MAP.updated_at_desc

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('properties')
    .select(`
      id, address, city, zone, sub_zone, stage, owner_disposition, transaction_type, property_type,
      sqm, rooms, estimated_value, updated_at,
      owner_contact:contacts!properties_owner_contact_id_fkey(name),
      agent:users!properties_agent_id_fkey(name)
    `, { count: 'exact' })
    .eq('workspace_id', profile.workspace_id)
    .order(sortOpt.col, { ascending: sortOpt.asc })
    .range((page - 1) * per_page, page * per_page - 1)

  if (stage) query = query.eq('stage', stage)
  if (city) query = query.eq('city', city)
  if (zone) query = query.eq('zone', zone)
  if (agent_id) query = query.eq('agent_id', agent_id)
  if (disposition) query = query.eq('owner_disposition', disposition)
  if (transaction_type) query = query.eq('transaction_type', transaction_type)

  // Text search across address, city, and zone.
  // Uses ILIKE for broad compatibility; when migration 050 is applied to the live
  // DB the search_vector GIN index will be used via textSearch instead.
  if (q) {
    query = query.or(`address.ilike.%${q}%,city.ilike.%${q}%,zone.ilike.%${q}%`)
  }
  // Via filter: matches street portion of address (before house number)
  if (street) {
    query = query.ilike('address', `%${street}%`)
  }
  // Civico filter: matches numeric portion of address
  if (civic) {
    query = query.ilike('address', `% ${civic}%`)
  }

  const { data, count } = await query

  // FIX: use RPC with DISTINCT ON to fetch only the last event per property.
  // Replaces the previous pattern that loaded ALL events then deduplicated in JS.
  const propertyIds = (data ?? []).map((p: { id: string }) => p.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lastEventsResult, stageCountsResult] = await Promise.all([
    // Last event per property via DB-level DISTINCT ON (requires migration 050)
    propertyIds.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (admin as any).rpc('get_last_events', { p_property_ids: propertyIds })
      : Promise.resolve({ data: [], error: null }),

    // Stage counts via GROUP BY in DB (requires migration 050)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).rpc('get_stage_counts', { p_workspace_id: profile.workspace_id }),
  ])

  const lastEventMap: Record<string, { event_type: string; title: string; event_date: string }> = {}

  if (!lastEventsResult.error && lastEventsResult.data) {
    // Fast path: RPC available (migration 050 applied)
    for (const ev of (lastEventsResult.data as { property_id: string; event_type: string; title: string; event_date: string }[])) {
      lastEventMap[ev.property_id] = ev
    }
  } else if (propertyIds.length > 0) {
    // Fallback: load all events and deduplicate in JS (pre-migration 050)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fallbackEvents } = await (admin as any)
      .from('property_events')
      .select('property_id, event_type, title, event_date')
      .in('property_id', propertyIds)
      .order('event_date', { ascending: false })
    for (const ev of ((fallbackEvents ?? []) as { property_id: string; event_type: string; title: string; event_date: string }[])) {
      if (!lastEventMap[ev.property_id]) lastEventMap[ev.property_id] = ev
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: Property[] = (data ?? []).map((p: any) => ({
    ...p,
    owner_name: (p.owner_contact as { name: string } | null)?.name ?? null,
    agent_name: (p.agent as { name: string } | null)?.name ?? null,
    estimated_value: p.estimated_value ?? null,
    last_event: lastEventMap[p.id] ?? null,
  }))

  let countByStage: Record<string, number>
  if (!stageCountsResult.error && stageCountsResult.data?.length > 0) {
    // Fast path: RPC available (migration 050 applied)
    countByStage = (stageCountsResult.data as { stage: string; cnt: number }[])
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.stage] = Number(row.cnt)
        return acc
      }, {})
  } else {
    // Fallback: full scan + JS reduce (pre-migration 050)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stageCounts } = await (admin as any)
      .from('properties')
      .select('stage')
      .eq('workspace_id', profile.workspace_id)
    countByStage = ((stageCounts ?? []) as { stage: string }[]).reduce<Record<string, number>>((acc, p) => {
      acc[p.stage] = (acc[p.stage] ?? 0) + 1
      return acc
    }, {})
  }

  // Zones for filter dropdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zonesData } = await (admin as any)
    .from('zones')
    .select('name, city')
    .eq('workspace_id', profile.workspace_id)
    .order('name')

  const zonesWithCity = (zonesData ?? []) as { name: string; city: string }[]
  const cities = Array.from(new Set(zonesWithCity.map(z => z.city))).sort()

  // Agents for filter dropdown (admins see all)
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentsData } = isAdmin
    ? await (admin as any).from('users').select('id, name').eq('workspace_id', profile.workspace_id).order('name')
    : { data: [] }

  const agents = (agentsData ?? []) as { id: string; name: string }[]

  return (
    <BancaDatiClient
      properties={properties as import('@/components/banca-dati/property-card').PropertyCardData[]}
      total={count ?? 0}
      page={page}
      perPage={per_page}
      countByStage={countByStage}
      zonesWithCity={zonesWithCity}
      cities={cities}
      agents={agents}
      isAdmin={isAdmin}
      initialFilters={{ stage, city, zone, agent_id, disposition, transaction_type, q, sort, viewMode, street, civic }}
    />
  )
}
