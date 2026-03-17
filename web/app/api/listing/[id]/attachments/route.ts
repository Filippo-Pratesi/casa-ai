import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkStorageQuota } from '@/lib/storage-limits'
import type { PlanTier } from '@/lib/storage-limits'

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
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('listing_attachments')
    .select('id, name, storage_path, size_bytes, mime_type, created_at')
    .eq('listing_id', id)
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ attachments: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file || !file.size) return NextResponse.json({ error: 'Nessun file' }, { status: 400 })

  // Check storage quota
  const { data: wsData } = await admin
    .from('workspaces')
    .select('plan')
    .eq('id', profile.workspace_id)
    .single()
  const plan = ((wsData as { plan: string } | null)?.plan ?? 'trial') as PlanTier
  const quota = await checkStorageQuota(profile.workspace_id, plan, file.size)
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message }, { status: 413 })
  }

  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${profile.workspace_id}/listings/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadError } = await admin.storage
    .from('listing-docs')
    .upload(storagePath, buffer, { contentType: file.type || 'application/octet-stream' })

  if (uploadError || !uploadData) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Errore upload file' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: record, error: dbError } = await (admin as any)
    .from('listing_attachments')
    .insert({
      listing_id: id,
      workspace_id: profile.workspace_id,
      name: file.name,
      storage_path: uploadData.path,
      size_bytes: file.size,
      mime_type: file.type || null,
      uploaded_by_user_id: user.id,
    })
    .select('id, name, storage_path, size_bytes, mime_type, created_at')
    .single()

  if (dbError) return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })
  return NextResponse.json({ attachment: record })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const body = await req.json()
  const attachmentId: string = body.attachment_id
  if (!attachmentId) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: att } = await (admin as any)
    .from('listing_attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .eq('listing_id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!att) return NextResponse.json({ error: 'Allegato non trovato' }, { status: 404 })

  await admin.storage.from('listing-docs').remove([att.storage_path])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('listing_attachments').delete().eq('id', attachmentId)

  return NextResponse.json({ success: true })
}
