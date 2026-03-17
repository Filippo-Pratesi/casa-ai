import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TYPE_MAP: Record<string, string> = {
  apartment: '1',   // Appartamento
  house: '2',       // Casa/Villetta
  villa: '3',       // Villa
  commercial: '13', // Locale commerciale
  land: '23',       // Terreno
  garage: '34',     // Box/Posto auto
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

function buildXml(listing: Record<string, unknown>, agencyName: string): string {
  const id = (listing.id as string).slice(0, 8).toUpperCase()
  const typeCode = TYPE_MAP[listing.property_type as string] ?? '99'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = listing.generated_content as any
  const description: string = content?.listing_it ?? ''
  const photos = (listing.photos_urls as string[]) ?? []

  const photoXml = photos
    .slice(0, 20)
    .map((url, i) => `    <foto principale="${i === 0 ? 'S' : 'N'}">${escapeXml(url)}</foto>`)
    .join('\n')

  const features = (listing.features as string[]) ?? []
  const hasGarage = features.includes('garage') ? 'S' : 'N'
  const hasElevator = features.includes('elevator') ? 'S' : 'N'
  const hasTerrace = features.includes('terrace') ? 'S' : 'N'
  const hasGarden = features.includes('garden') ? 'S' : 'N'

  return `<?xml version="1.0" encoding="UTF-8"?>
<lista_immobili>
  <immobile>
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
    <garage>${hasGarage}</garage>
    <ascensore>${hasElevator}</ascensore>
    <terrazzo>${hasTerrace}</terrazzo>
    <giardino>${hasGarden}</giardino>
    <agenzia>${escapeXml(agencyName)}</agenzia>
    <foto_list>
${photoXml}
    </foto_list>
  </immobile>
</lista_immobili>`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  const { data: listingData, error } = await admin
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (error || !listingData) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const xml = buildXml(listingData as Record<string, unknown>, profile.workspaces.name)

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="immobile-${id.slice(0, 8)}.xml"`,
    },
  })
}
