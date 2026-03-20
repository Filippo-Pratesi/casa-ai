import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateListingContent } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null

  if (!profile) {
    return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 })
  }

  const VALID_PROPERTY_TYPES = ['apartment', 'house', 'villa', 'commercial', 'land', 'garage', 'other']
  const VALID_TRANSACTION_TYPES = ['vendita', 'affitto']
  const VALID_TONES = ['standard', 'luxury', 'approachable', 'investment']

  const property_type = formData.get('property_type') as string
  const transaction_type = (formData.get('transaction_type') as string) || 'vendita'
  const floor = formData.get('floor') ? Number(formData.get('floor')) : null
  const total_floors = formData.get('total_floors') ? Number(formData.get('total_floors')) : null
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const neighborhood = (formData.get('neighborhood') as string) || null
  const price = Number(formData.get('price'))
  const sqm = Number(formData.get('sqm'))
  const rooms = Number(formData.get('rooms'))
  // A8: normalize bathrooms — default to 1 if missing, zero, or NaN
  const bathroomsRaw = Number(formData.get('bathrooms') ?? '1')
  const bathrooms = bathroomsRaw > 0 && !isNaN(bathroomsRaw) ? bathroomsRaw : 1
  const condition = (formData.get('condition') as string) || null
  const notes = (formData.get('notes') as string) || null
  const tone = (formData.get('tone') as string) || 'standard'
  const foglio = (formData.get('foglio') as string) || null
  const particella = (formData.get('particella') as string) || null
  const subalterno = (formData.get('subalterno') as string) || null
  const categoria_catastale = (formData.get('categoria_catastale') as string) || null
  const rendita_catastale = formData.get('rendita_catastale') ? Number(formData.get('rendita_catastale')) : null

  // Safe JSON parse for features array
  let features: string[] = []
  try {
    const featuresRaw = formData.get('features') as string
    const parsed = featuresRaw ? JSON.parse(featuresRaw) : []
    features = Array.isArray(parsed) ? parsed : []
  } catch {
    return NextResponse.json({ error: 'Campo features non valido' }, { status: 400 })
  }

  // Field validation
  if (!property_type || !address || !city || !price || !sqm || !rooms) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }
  if (!VALID_PROPERTY_TYPES.includes(property_type)) {
    return NextResponse.json({ error: 'Tipo immobile non valido' }, { status: 400 })
  }
  if (!VALID_TRANSACTION_TYPES.includes(transaction_type)) {
    return NextResponse.json({ error: 'Tipo transazione non valido' }, { status: 400 })
  }
  if (!VALID_TONES.includes(tone)) {
    return NextResponse.json({ error: 'Tono non valido' }, { status: 400 })
  }
  if (sqm <= 0 || isNaN(sqm)) {
    return NextResponse.json({ error: 'Superficie deve essere > 0' }, { status: 400 })
  }
  if (rooms <= 0 || isNaN(rooms)) {
    return NextResponse.json({ error: 'Numero vani deve essere > 0' }, { status: 400 })
  }
  if (price <= 0 || isNaN(price)) {
    return NextResponse.json({ error: 'Prezzo deve essere > 0' }, { status: 400 })
  }

  const photoFiles = formData.getAll('photos') as File[]

  // A1: Upload photos in parallel instead of sequentially
  const uploadPromises = photoFiles
    .filter(photo => photo.size > 0)
    .map(async (photo) => {
      const buffer = await photo.arrayBuffer()
      const ext = photo.name.split('.').pop() ?? 'jpg'
      const fileName = `${profile.workspace_id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('listings')
        .upload(fileName, buffer, { contentType: photo.type || 'image/jpeg' })
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('listings').getPublicUrl(uploadData.path)
        return urlData.publicUrl
      }
      return null
    })

  const uploadResults = await Promise.all(uploadPromises)
  const photoUrls: string[] = uploadResults.filter((url): url is string => url !== null)

  // Generate content with DeepSeek (text-only, no vision in testing phase)
  const propertyData = {
    property_type,
    floor,
    total_floors,
    address,
    city,
    neighborhood,
    price,
    sqm,
    rooms,
    bathrooms,
    condition,
    features,
    notes,
    tone: tone as 'standard' | 'luxury' | 'approachable' | 'investment',
  }

  let generated_content
  try {
    generated_content = await generateListingContent(propertyData)
  } catch (err) {
    console.error('DeepSeek generation error:', err)
    return NextResponse.json({ error: 'Errore nella generazione AI. Riprova.' }, { status: 500 })
  }

  // Save listing to DB — cast to bypass typed client mismatch with hand-written Database type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingData, error: dbError } = await (supabase as any)
    .from('listings')
    .insert({
      workspace_id: profile.workspace_id,
      agent_id: user.id,
      property_type: property_type as 'apartment' | 'house' | 'villa' | 'commercial' | 'land' | 'garage' | 'other',
      transaction_type: transaction_type as 'vendita' | 'affitto',
      floor,
      total_floors,
      address,
      city,
      neighborhood,
      price,
      sqm,
      rooms,
      bathrooms,
      features,
      condition,
      notes,
      tone: tone as 'standard' | 'luxury' | 'approachable' | 'investment',
      photos_urls: photoUrls,
      vision_labels: {},
      generated_content,
      foglio,
      particella,
      subalterno,
      categoria_catastale,
      rendita_catastale,
      status: 'draft',
    })
    .select('id')
    .single()

  const listing = listingData as { id: string } | null

  if (dbError || !listing) {
    console.error('DB insert error:', dbError)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  // If an existing property is linked, connect them and sync fields
  const propertyId = (formData.get('property_id') as string) || null

  if (propertyId) {
    // Link listing to existing property (non-blocking, best-effort)
    void linkExistingProperty({
      admin,
      workspaceId: profile.workspace_id,
      agentId: user.id,
      listingId: listing.id,
      propertyId,
      sqm,
      rooms,
      bathrooms,
      floor,
      totalFloors: total_floors,
      estimatedValue: price,
      condition,
      foglio: foglio ?? undefined,
      particella: particella ?? undefined,
      subalterno: subalterno ?? undefined,
    })
  } else {
    // Auto-create banca dati property entry — non-blocking, best-effort
    void autoCreateProperty({
      supabase,
      workspaceId: profile.workspace_id,
      agentId: user.id,
      listingId: listing.id,
      address,
      city,
      zone: neighborhood ?? 'Da definire',
      propertyType: property_type,
      transactionType: transaction_type,
      sqm,
      rooms,
      bathrooms,
      floor,
      totalFloors: total_floors,
      estimatedValue: price,
      foglio: foglio ?? undefined,
      particella: particella ?? undefined,
      subalterno: subalterno ?? undefined,
    })
  }

  return NextResponse.json({ listing_id: listing.id, generated_content }, { status: 201 })
}

async function linkExistingProperty(opts: {
  admin: ReturnType<typeof createAdminClient>
  workspaceId: string
  agentId: string
  listingId: string
  propertyId: string
  sqm: number
  rooms: number
  bathrooms: number
  floor: number | null
  totalFloors: number | null
  estimatedValue: number
  condition: string | null
  foglio?: string
  particella?: string
  subalterno?: string
}) {
  try {
    const { admin, workspaceId, agentId, listingId, propertyId } = opts

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any

    // Sync fields from listing to property
    await adminAny.from('properties').update({
      listing_id: listingId,
      sqm: opts.sqm,
      rooms: opts.rooms,
      bathrooms: opts.bathrooms,
      floor: opts.floor,
      total_floors: opts.totalFloors,
      estimated_value: opts.estimatedValue,
      condition: opts.condition,
      foglio: opts.foglio ?? null,
      particella: opts.particella ?? null,
      subalterno: opts.subalterno ?? null,
    }).eq('id', propertyId).eq('workspace_id', workspaceId)

    // Back-link: listing → property
    await adminAny.from('listings').update({ property_id: propertyId }).eq('id', listingId)

    // Create event
    await adminAny.from('property_events').insert({
      workspace_id: workspaceId,
      property_id: propertyId,
      agent_id: agentId,
      event_type: 'annuncio_creato',
      title: 'Annuncio creato',
      description: 'Annuncio creato e collegato all\'immobile',
    })
  } catch (err) {
    console.error('linkExistingProperty failed (non-critical):', err)
  }
}

async function autoCreateProperty(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  workspaceId: string
  agentId: string
  listingId: string
  address: string
  city: string
  zone: string
  propertyType: string
  transactionType: string
  sqm: number
  rooms: number
  bathrooms: number
  floor: number | null
  totalFloors: number | null
  estimatedValue: number
  foglio?: string
  particella?: string
  subalterno?: string
}) {
  try {
    // Geocode address via Mapbox to get coordinates
    const token = process.env.MAPBOX_ACCESS_TOKEN
    let latitude: number | null = null
    let longitude: number | null = null
    if (token) {
      try {
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${opts.address}, ${opts.city}`)}.json?country=it&language=it&types=address&limit=1&access_token=${token}`
        const geoRes = await fetch(geoUrl, { next: { revalidate: 0 } })
        if (geoRes.ok) {
          const geoData = await geoRes.json() as { features?: Array<{ geometry: { coordinates: [number, number] } }> }
          if (geoData.features?.[0]) {
            ;[longitude, latitude] = geoData.features[0].geometry.coordinates
          }
        }
      } catch (geoErr) {
        // Geocoding failed — property will be created without coordinates
        console.warn('Geocoding failed for auto-property creation (non-critical):', geoErr instanceof Error ? geoErr.message : 'unknown error')
      }
    }

    // Check if a property with same listing_id already exists
    const { data: existing } = await opts.supabase
      .from('properties')
      .select('id')
      .eq('listing_id', opts.listingId)
      .single()
    if (existing) return // Already linked

    // Create property record
    const { data: property } = await opts.supabase
      .from('properties')
      .insert({
        workspace_id: opts.workspaceId,
        agent_id: opts.agentId,
        listing_id: opts.listingId,
        address: opts.address,
        city: opts.city,
        zone: opts.zone,
        latitude,
        longitude,
        property_type: opts.propertyType,
        transaction_type: opts.transactionType,
        sqm: opts.sqm,
        rooms: opts.rooms,
        bathrooms: opts.bathrooms,
        floor: opts.floor,
        total_floors: opts.totalFloors,
        estimated_value: opts.estimatedValue,
        foglio: opts.foglio ?? null,
        particella: opts.particella ?? null,
        subalterno: opts.subalterno ?? null,
        stage: 'incarico',
        owner_disposition: 'incarico_firmato',
      })
      .select('id')
      .single()

    if (!property) return

    // Back-link listing to property
    await opts.supabase
      .from('listings')
      .update({ property_id: property.id })
      .eq('id', opts.listingId)

    // Create initial event
    await opts.supabase
      .from('property_events')
      .insert({
        workspace_id: opts.workspaceId,
        property_id: property.id,
        agent_id: opts.agentId,
        event_type: 'annuncio_creato',
        title: 'Annuncio creato',
        description: `Annuncio creato dal form — immobile aggiunto automaticamente alla banca dati`,
      })
  } catch (err) {
    console.error('autoCreateProperty failed (non-critical):', err)
  }
}
