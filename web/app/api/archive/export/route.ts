import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsv).join(',')
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'listings'

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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 403 })

  let csv = ''
  let filename = ''

  if (type === 'listings') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('archived_listings')
      .select('id, original_id, address, city, neighborhood, price, property_type, sqm, rooms, bathrooms, floor, total_floors, sold, sold_to_name, archived_at')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false })

    const rows = (data ?? []) as Record<string, unknown>[]
    const headers = ['id', 'original_id', 'indirizzo', 'città', 'quartiere', 'prezzo', 'tipo', 'mq', 'locali', 'bagni', 'piano', 'piani_totali', 'venduto', 'venduto_a', 'archiviato_il']
    csv = [
      headers.join(','),
      ...rows.map(r => toCsvRow([
        r.id, r.original_id, r.address, r.city, r.neighborhood,
        r.price, r.property_type, r.sqm, r.rooms, r.bathrooms,
        r.floor, r.total_floors, r.sold ? 'sì' : 'no', r.sold_to_name,
        r.archived_at ? new Date(r.archived_at as string).toLocaleDateString('it-IT') : '',
      ])),
    ].join('\n')
    filename = `archivio_immobili_${new Date().toISOString().slice(0, 10)}.csv`
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from('archived_contacts')
      .select('id, name, type, phone, email, bought_listing, bought_listing_address, archived_at')
      .eq('workspace_id', profile.workspace_id)
      .order('archived_at', { ascending: false })

    const rows = (data ?? []) as Record<string, unknown>[]
    const headers = ['id', 'nome', 'tipo', 'telefono', 'email', 'ha_acquistato', 'immobile_acquistato', 'archiviato_il']
    csv = [
      headers.join(','),
      ...rows.map(r => toCsvRow([
        r.id, r.name, r.type, r.phone, r.email,
        r.bought_listing ? 'sì' : 'no', r.bought_listing_address,
        r.archived_at ? new Date(r.archived_at as string).toLocaleDateString('it-IT') : '',
      ])),
    ].join('\n')
    filename = `archivio_contatti_${new Date().toISOString().slice(0, 10)}.csv`
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
