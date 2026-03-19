import { NextRequest, NextResponse } from 'next/server'
import { getCadastralDataByCoordinates } from '@/lib/zornade'

// GET /api/catasto/parcels?lat=43.95&lng=10.16
export async function GET(req: NextRequest) {
  const latStr = req.nextUrl.searchParams.get('lat')
  const lngStr = req.nextUrl.searchParams.get('lng')

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: 'Parametri lat e lng obbligatori' },
      { status: 400 }
    )
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng) || lat < 35 || lat > 48 || lng < 6 || lng > 19) {
    return NextResponse.json(
      { error: 'Coordinate non valide per il territorio italiano' },
      { status: 400 }
    )
  }

  const { data, error } = await getCadastralDataByCoordinates(lat, lng)

  if (error) {
    return NextResponse.json(
      { error },
      { status: 502 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { data: null, message: 'Nessuna particella catastale trovata per queste coordinate' }
    )
  }

  return NextResponse.json({ data })
}
