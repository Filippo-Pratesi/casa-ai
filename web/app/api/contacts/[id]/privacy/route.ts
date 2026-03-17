import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
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
  const consent: boolean = body.consent === true

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('contacts')
    .update({
      privacy_consent: consent,
      privacy_consent_date: consent ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (error) return NextResponse.json({ error: 'Errore aggiornamento consenso' }, { status: 500 })
  return NextResponse.json({ success: true, consent, date: consent ? new Date().toISOString() : null })
}
