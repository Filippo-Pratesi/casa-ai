import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, role } = await req.json()

  if (!email || !name) {
    return NextResponse.json({ error: 'Email e nome sono obbligatori' }, { status: 400 })
  }

  // Only group_admin can invite admins
  const targetRole = role === 'admin' && profile.role === 'group_admin' ? 'admin' : 'agent'

  // Check if email already exists in workspace
  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('workspace_id', profile.workspace_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Questo utente è già nel workspace' }, { status: 409 })
  }

  // Check if user already has an auth account
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const existingAuthUser = authUsers?.users.find(u => u.email === email)

  if (existingAuthUser) {
    // User already exists in auth — just add them to this workspace
    const { error: insertErr } = await admin
      .from('users')
      .insert({
        id: existingAuthUser.id,
        workspace_id: profile.workspace_id,
        name,
        email,
        role: targetRole,
      })
    if (insertErr) {
      console.error('Insert user error:', insertErr)
      return NextResponse.json({ error: 'Errore durante l\'aggiunta' }, { status: 500 })
    }
    return NextResponse.json({ message: 'Utente aggiunto al workspace' }, { status: 201 })
  }

  // New user — send invite email
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      workspace_id: profile.workspace_id,
      name,
      role: targetRole,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/setup`,
  })

  if (inviteErr || !inviteData?.user) {
    console.error('Invite error:', inviteErr)
    return NextResponse.json({ error: 'Errore durante l\'invito' }, { status: 500 })
  }

  // Pre-create user record so they appear in the team list immediately
  const { error: insertErr } = await admin
    .from('users')
    .insert({
      id: inviteData.user.id,
      workspace_id: profile.workspace_id,
      name,
      email,
      role: targetRole,
    })

  if (insertErr) {
    console.error('Insert invited user error:', insertErr)
    // Non-fatal: invite was sent, user record creation failed
  }

  return NextResponse.json({ message: 'Invito inviato con successo' }, { status: 201 })
}
