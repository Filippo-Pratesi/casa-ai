import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; workspace_id: string } | null

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo gli admin possono modificare il workspace' }, { status: 403 })
  }

  const { name, tone_default } = await req.json()

  const validTones = ['standard', 'luxury', 'approachable', 'investment']
  if (tone_default && !validTones.includes(tone_default)) {
    return NextResponse.json({ error: 'Tono non valido' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('workspaces')
    .update({
      ...(name ? { name } : {}),
      ...(tone_default ? { tone_default } : {}),
    })
    .eq('id', profile.workspace_id)

  if (error) {
    console.error('Workspace update error:', error)
    return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
