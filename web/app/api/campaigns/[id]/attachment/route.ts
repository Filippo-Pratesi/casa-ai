import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/campaigns/[id]/attachment — upload file attachment for a campaign
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
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nessun file' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${profile.workspace_id}/${id}/allegato.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = new Uint8Array(bytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: uploadError } = await (admin as any)
    .storage
    .from('campaign-attachments')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    // Try to create the bucket if it doesn't exist
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).storage.createBucket('campaign-attachments', { public: false })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: retryError } = await (admin as any)
      .storage
      .from('campaign-attachments')
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (retryError) return NextResponse.json({ error: 'Errore upload' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: urlData } = (admin as any)
    .storage
    .from('campaign-attachments')
    .getPublicUrl(path)

  const attachmentUrl = urlData?.publicUrl ?? null

  // Save to campaign record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('campaigns')
    .update({ attachment_url: attachmentUrl, attachment_name: file.name })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  return NextResponse.json({ url: attachmentUrl, name: file.name })
}

// DELETE /api/campaigns/[id]/attachment — remove attachment
export async function DELETE(
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
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('campaigns')
    .update({ attachment_url: null, attachment_name: null })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id) // security: prevent cross-workspace modification

  return NextResponse.json({ success: true })
}
