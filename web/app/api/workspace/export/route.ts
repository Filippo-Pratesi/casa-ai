import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TYPE_MAP: Record<string, string> = {
  apartment: '1',
  house: '2',
  villa: '3',
  commercial: '13',
  land: '23',
  garage: '34',
  other: '99',
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function listingToXml(listing: Record<string, unknown>): string {
  const id = (listing.id as string).slice(0, 8).toUpperCase()
  const typeCode = TYPE_MAP[listing.property_type as string] ?? '99'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = listing.generated_content as any
  const description: string = content?.listing_it ?? ''
  const photos = (listing.photos_urls as string[]) ?? []

  const photoXml = photos
    .slice(0, 20)
    .map((url, i) => `      <foto principale="${i === 0 ? 'S' : 'N'}">${escapeXml(url)}</foto>`)
    .join('\n')

  const features = (listing.features as string[]) ?? []

  return `  <immobile>
    <riferimento>${id}</riferimento>
    <tipologia_immobile>${typeCode}</tipologia_immobile>
    <contratto>1</contratto>
    <titolo>${escapeXml(listing.address as string)}</titolo>
    <descrizione>${escapeXml(description)}</descrizione>
    <prezzo>${listing.price as number}</prezzo>
    <indirizzo>${escapeXml(listing.address as string)}</indirizzo>
    <comune>${escapeXml(listing.city as string)}</comune>
    ${listing.neighborhood ? `<zona>${escapeXml(listing.neighborhood as string)}</zona>` : ''}
    <superficie>${listing.sqm as number}</superficie>
    <locali>${listing.rooms as number}</locali>
    <bagni>${listing.bathrooms as number}</bagni>
    ${listing.floor != null ? `<piano>${listing.floor as number}</piano>` : ''}
    ${listing.total_floors != null ? `<piani_totali>${listing.total_floors as number}</piani_totali>` : ''}
    <garage>${features.includes('garage') ? 'S' : 'N'}</garage>
    <ascensore>${features.includes('elevator') ? 'S' : 'N'}</ascensore>
    <terrazzo>${features.includes('terrace') ? 'S' : 'N'}</terrazzo>
    <giardino>${features.includes('garden') ? 'S' : 'N'}</giardino>
    <foto_list>
${photoXml}
    </foto_list>
  </immobile>`
}

// GET /api/workspace/export — export all published listings as Immobiliare.it XML
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, workspaces(name)')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; workspaces: { name: string } } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const { data: listings } = await admin
    .from('listings')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const items = ((listings ?? []) as Record<string, unknown>[])
    .map(listingToXml)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Export generato da CasaAI il ${new Date().toLocaleDateString('it-IT')} -->
<!-- Agenzia: ${escapeXml(profile.workspaces.name)} -->
<lista_immobili>
${items}
</lista_immobili>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="export-portali-${new Date().toISOString().slice(0, 10)}.xml"`,
    },
  })
}
