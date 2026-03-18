import { NextRequest, NextResponse } from 'next/server'

type MapboxFeature = {
  place_name: string
  geometry: { coordinates: [number, number] }
  context?: Array<{ id: string; text: string }>
  text: string
  properties?: Record<string, unknown>
}

type MapboxResponse = {
  features: MapboxFeature[]
}

// GET /api/geocode — proxy to Mapbox Geocoding API
export async function GET(req: NextRequest) {
  const token = process.env.MAPBOX_ACCESS_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'Servizio di geocodifica non configurato' },
      { status: 503 }
    )
  }

  const q = req.nextUrl.searchParams.get('q')
  const country = req.nextUrl.searchParams.get('country') ?? 'it'
  const type = req.nextUrl.searchParams.get('type') ?? 'address' // 'address' or 'place'
  const proximity = req.nextUrl.searchParams.get('proximity') // 'lng,lat' string

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'Parametro di ricerca troppo breve' }, { status: 400 })
  }

  const types = type === 'place' ? 'place,locality,region' : 'address'
  let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q.trim())}.json?country=${country}&language=it&types=${types}&access_token=${token}`

  if (proximity && type !== 'place') {
    url += `&proximity=${proximity}`
  }

  let mapboxData: MapboxResponse
  try {
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Errore nel servizio di geocodifica' }, { status: 502 })
    }
    mapboxData = await res.json() as MapboxResponse
  } catch {
    return NextResponse.json({ error: 'Errore nella chiamata al servizio di geocodifica' }, { status: 502 })
  }

  const suggestions = (mapboxData.features ?? []).map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates
    if (type === 'place') {
      // For city search, return the place name as city
      const regionContext = (feature.context ?? []).find(c => c.id.startsWith('region.'))
      return {
        place_name: feature.place_name,
        address: feature.text ?? feature.place_name,
        city: feature.text ?? feature.place_name,
        region: regionContext?.text ?? '',
        latitude,
        longitude,
      }
    }
    // Original address logic
    const cityContext = (feature.context ?? []).find(
      (c) => c.id.startsWith('place.') || c.id.startsWith('locality.')
    )
    return {
      place_name: feature.place_name,
      address: feature.text ?? feature.place_name,
      city: cityContext?.text ?? '',
      latitude,
      longitude,
    }
  })

  return NextResponse.json({ suggestions })
}
