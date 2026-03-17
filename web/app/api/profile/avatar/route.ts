import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || !file.size) return NextResponse.json({ error: 'Nessun file' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Il file deve essere un\'immagine' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Immagine troppo grande (max 5MB)' }, { status: 413 })
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `avatars/${user.id}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('user-avatars')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    return NextResponse.json({ error: 'Errore upload immagine' }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('user-avatars')
    .getPublicUrl(storagePath)

  // Append cache-buster to avoid stale avatar
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: dbError } = await admin
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.json({ error: 'Errore salvataggio URL avatar' }, { status: 500 })
  }

  return NextResponse.json({ avatar_url: avatarUrl })
}
