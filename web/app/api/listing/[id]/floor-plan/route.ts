import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/listing/[id]/floor-plan — upload floor plan image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // Verify listing belongs to user's workspace
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingData, error: listingError } = await (admin as any)
    .from('listings')
    .select('id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (listingError || !listingData) {
    return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Solo immagini sono accettate' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filePath = `floor-plans/${id}/planimetria.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await admin.storage
    .from('listing-photos')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('listing-photos')
    .getPublicUrl(filePath)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('listings')
    .update({ floor_plan_url: publicUrl })
    .eq('id', id)

  return NextResponse.json({ url: publicUrl })
}

// DELETE /api/listing/[id]/floor-plan — remove floor plan
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()

  // Verify listing belongs to user's workspace before modifying
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listingData } = await (admin as any)
    .from('listings')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()
  if (!listingData) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('listings')
    .update({ floor_plan_url: null })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  return NextResponse.json({ ok: true })
}
