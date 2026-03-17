import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateListingContent } from '@/lib/deepseek'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { data: profileData } = await supabase
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

  const property_type = formData.get('property_type') as string
  const floor = formData.get('floor') ? Number(formData.get('floor')) : null
  const total_floors = formData.get('total_floors') ? Number(formData.get('total_floors')) : null
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const neighborhood = (formData.get('neighborhood') as string) || null
  const price = Number(formData.get('price'))
  const sqm = Number(formData.get('sqm'))
  const rooms = Number(formData.get('rooms'))
  const bathrooms = Number(formData.get('bathrooms') ?? '1')
  const features = JSON.parse((formData.get('features') as string) ?? '[]') as string[]
  const condition = (formData.get('condition') as string) || null
  const notes = (formData.get('notes') as string) || null
  const tone = (formData.get('tone') as string) || 'standard'
  const foglio = (formData.get('foglio') as string) || null
  const particella = (formData.get('particella') as string) || null
  const subalterno = (formData.get('subalterno') as string) || null
  const categoria_catastale = (formData.get('categoria_catastale') as string) || null
  const rendita_catastale = formData.get('rendita_catastale') ? Number(formData.get('rendita_catastale')) : null

  if (!property_type || !address || !city || !price || !sqm || !rooms) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const photoFiles = formData.getAll('photos') as File[]

  // Upload photos to Supabase Storage
  const photoUrls: string[] = []

  for (const photo of photoFiles) {
    if (!photo.size) continue

    const buffer = await photo.arrayBuffer()

    const ext = photo.name.split('.').pop() ?? 'jpg'
    const fileName = `${profile.workspace_id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('listings')
      .upload(fileName, buffer, { contentType: photo.type || 'image/jpeg' })

    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(uploadData.path)
      photoUrls.push(urlData.publicUrl)
    }
  }

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

  return NextResponse.json({ listing_id: listing.id, generated_content }, { status: 201 })
}
