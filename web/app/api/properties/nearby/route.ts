import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getWorkspaceId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', userId)
    .single()
  return (data as { workspace_id: string } | null)?.workspace_id ?? null
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dlat = toRad(lat2 - lat1)
  const dlon = toRad(lon2 - lon1)
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// GET /api/properties/nearby — find properties near a coordinate
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const params = req.nextUrl.searchParams
  const latStr = params.get('lat')
  const lngStr = params.get('lng')
  const radiusStr = params.get('radius') ?? '100'
  const excludeId = params.get('exclude_id') ?? null
  const referenceAddress = params.get('address') ?? null

  const lat = parseFloat(latStr ?? '')
  const lng = parseFloat(lngStr ?? '')
  const radius = Math.min(5000, Math.max(1, parseFloat(radiusStr)))

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'Parametri lat e lng obbligatori' }, { status: 400 })
  }

  // Use bounding box first for DB-level filtering, then refine with Haversine in JS
  // 1 degree latitude ≈ 111,000m; 1 degree longitude varies by latitude
  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('properties')
    .select('id, address, city, zone, sub_zone, stage, latitude, longitude, sqm, rooms, property_type, owner_disposition')
    .eq('workspace_id', workspaceId)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Errore nella ricerca di vicinanza' }, { status: 500 })

  type NearbyProperty = {
    id: string
    address: string
    city: string
    zone: string | null
    sub_zone: string | null
    stage: string
    latitude: number
    longitude: number
    sqm: number | null
    rooms: number | null
    property_type: string | null
    owner_disposition: string | null
    distance_m?: number
  }

  const properties: NearbyProperty[] = (data ?? []) as NearbyProperty[]

  // Refine with precise Haversine distance and split into groups
  const same_building: NearbyProperty[] = []
  const nearby: NearbyProperty[] = []

  for (const prop of properties) {
    if (prop.latitude == null || prop.longitude == null) continue
    const dist = haversineMeters(lat, lng, prop.latitude, prop.longitude)
    if (dist > radius) continue

    const withDist = { ...prop, distance_m: Math.round(dist) }

    // Same building: if reference address provided, compare strings; else use very small distance proxy
    const isSameBuilding = referenceAddress
      ? prop.address.toLowerCase().trim() === referenceAddress.toLowerCase().trim()
      : dist < 5
    if (isSameBuilding) {
      same_building.push(withDist)
    } else {
      nearby.push(withDist)
    }
  }

  nearby.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
  same_building.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))

  return NextResponse.json({ same_building, nearby })
}
