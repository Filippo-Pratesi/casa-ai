import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const storagePath = req.nextUrl.searchParams.get('path')
  if (!storagePath) return NextResponse.json({ error: 'Path mancante' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the requesting user's workspace_id owns this storage path
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  if (!storagePath.startsWith(`${profile.workspace_id}/`)) {
    return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const { data, error } = await admin.storage.from('contact-docs').download(storagePath)
  if (error || !data) return NextResponse.json({ error: 'File non trovato' }, { status: 404 })

  const buffer = await data.arrayBuffer()
  const filename = storagePath.split('/').pop() ?? 'file'

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
