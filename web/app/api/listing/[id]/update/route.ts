import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/listing/[id]/update — full listing field update (excluding price history)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

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

  // Existing photo URLs to keep
  const existingPhotosRaw = (formData.get('existing_photos') as string) || '[]'
  let existingPhotos: string[] = []
  try { existingPhotos = JSON.parse(existingPhotosRaw) } catch { existingPhotos = [] }

  // Upload new photos
  const newPhotoFiles = formData.getAll('new_photos') as File[]
  const newPhotoUrls: string[] = []
  for (const photo of newPhotoFiles) {
    if (!photo.size) continue
    const buffer = await photo.arrayBuffer()
    const ext = photo.name.split('.').pop() ?? 'jpg'
    const fileName = `${profile.workspace_id}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('listings')
      .upload(fileName, buffer, { contentType: photo.type || 'image/jpeg' })
    if (!uploadError && uploadData) {
      const { data: urlData } = supabase.storage.from('listings').getPublicUrl(uploadData.path)
      newPhotoUrls.push(urlData.publicUrl)
    }
  }

  const photos_urls = [...existingPhotos, ...newPhotoUrls]

  if (!property_type || !address || !city || price <= 0 || sqm <= 0 || rooms <= 0) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti o non validi' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('listings')
    .update({
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
      features,
      condition,
      notes,
      tone,
      foglio,
      particella,
      subalterno,
      categoria_catastale,
      rendita_catastale,
      photos_urls,
    })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  return NextResponse.json({ success: true })
}
