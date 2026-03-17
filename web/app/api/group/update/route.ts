import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('users')
    .select('role, group_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; group_id: string | null } | null

  if (profile?.role !== 'group_admin' || !profile.group_id) {
    return NextResponse.json({ error: 'Accesso non consentito' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const allowed: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) allowed.name = body.name.trim()
  if (typeof body.show_cross_agency_results === 'boolean') {
    allowed.show_cross_agency_results = body.show_cross_agency_results
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('groups')
    .update(allowed)
    .eq('id', profile.group_id)

  if (error) return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })

  return NextResponse.json({ success: true })
}
