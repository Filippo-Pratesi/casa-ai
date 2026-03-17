import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer, Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

// Register font (Helvetica is built-in, no registration needed)

const FEATURE_LABELS: Record<string, string> = {
  terrace: 'Terrazzo',
  garage: 'Garage',
  elevator: 'Ascensore',
  parking: 'Posto auto',
  renovated_kitchen: 'Cucina ristrutturata',
  sea_view: 'Vista mare',
  garden: 'Giardino',
  storage: 'Ripostiglio',
  cellar: 'Cantina',
  panoramic_view: 'Vista panoramica',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Immobile',
}

const CONDITION_LABELS: Record<string, string> = {
  ottimo: 'Ottimo stato',
  buono: 'Buono stato',
  sufficiente: 'Sufficiente',
  da_ristrutturare: 'Da ristrutturare',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  // Header bar
  header: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAgency: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  headerRef: {
    color: '#aaaaaa',
    fontSize: 9,
  },
  // Hero photo
  heroPhoto: {
    width: '100%',
    height: 240,
    objectFit: 'cover',
  },
  heroPhotoPlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#f0f0f0',
  },
  // Photo grid (max 4 secondary photos)
  photoGrid: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    paddingHorizontal: 0,
    height: 100,
  },
  gridPhoto: {
    flex: 1,
    objectFit: 'cover',
  },
  // Main content
  content: {
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  // Price + address block
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    flex: 1,
    marginRight: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  subtitle: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 16,
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 16,
    borderTop: '1pt solid #eeeeee',
    borderBottom: '1pt solid #eeeeee',
    paddingVertical: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  statLabel: {
    fontSize: 8,
    color: '#999999',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 4,
  },
  // Description
  sectionLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  description: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  // Features
  featuresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 16,
  },
  featureChip: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    color: '#444444',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderTop: '1pt solid #eeeeee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#aaaaaa',
  },
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const adminClient = createAdminClient()
  const { data: profileData } = await adminClient
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const { data: listingData, error: listingError } = await adminClient
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (listingError || !listingData) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const { data: workspaceData } = await adminClient
    .from('workspaces')
    .select('name')
    .eq('id', profile.workspace_id)
    .single()

  const listing = listingData as Record<string, unknown>
  const workspace = workspaceData as { name: string } | null
  const agencyName = workspace?.name ?? 'CasaAI'

  const photos = (listing.photos_urls as string[]) ?? []
  const features = (listing.features as string[]) ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generatedContent = listing.generated_content as any
  const description: string = generatedContent?.listing_it ?? ''

  const floor = listing.floor != null ? `Piano ${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ''}` : null
  const condition = listing.condition ? CONDITION_LABELS[listing.condition as string] ?? null : null

  const pdf = await renderToBuffer(
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerAgency}>{agencyName}</Text>
          <Text style={styles.headerRef}>Rif. {(id as string).slice(0, 8).toUpperCase()}</Text>
        </View>

        {/* Hero photo */}
        {photos[0] ? (
          <Image src={photos[0]} style={styles.heroPhoto} />
        ) : (
          <View style={styles.heroPhotoPlaceholder} />
        )}

        {/* Secondary photos grid */}
        {photos.length > 1 && (
          <View style={styles.photoGrid}>
            {photos.slice(1, 5).map((url, i) => (
              <Image key={i} src={url} style={styles.gridPhoto} />
            ))}
          </View>
        )}

        {/* Main content */}
        <View style={styles.content}>
          {/* Address + Price */}
          <View style={styles.titleRow}>
            <Text style={styles.address}>{listing.address as string}</Text>
            <Text style={styles.price}>€ {(listing.price as number).toLocaleString('it-IT')}</Text>
          </View>
          <Text style={styles.subtitle}>
            {TYPE_LABELS[listing.property_type as string] ?? listing.property_type as string}
            {' · '}{listing.city as string}
            {listing.neighborhood ? ` · ${listing.neighborhood as string}` : ''}
            {condition ? ` · ${condition}` : ''}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listing.sqm as number} m²</Text>
              <Text style={styles.statLabel}>Superficie</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listing.rooms as number}</Text>
              <Text style={styles.statLabel}>Locali</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{listing.bathrooms as number}</Text>
              <Text style={styles.statLabel}>Bagni</Text>
            </View>
            {floor && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{floor}</Text>
                  <Text style={styles.statLabel}>Piano</Text>
                </View>
              </>
            )}
          </View>

          {/* Description */}
          {description ? (
            <>
              <Text style={styles.sectionLabel}>Descrizione</Text>
              <Text style={styles.description}>{description}</Text>
            </>
          ) : null}

          {/* Features */}
          {features.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Caratteristiche</Text>
              <View style={styles.featuresWrap}>
                {features.map((f) => (
                  <Text key={f} style={styles.featureChip}>
                    {FEATURE_LABELS[f] ?? f}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{agencyName}</Text>
          <Text style={styles.footerText}>
            Documento generato il {new Date().toLocaleDateString('it-IT')}
          </Text>
        </View>
      </Page>
    </Document>
  )

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="annuncio-${id.slice(0, 8)}.pdf"`,
    },
  })
}
