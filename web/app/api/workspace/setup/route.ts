import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  // Uses service role to bypass RLS for initial workspace setup
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { name, userName, userId, email } = await req.json()

    if (!name || !userName || !userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create workspace
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .insert({ name, tone_default: 'standard', plan: 'trial' })
      .select()
      .single()

    if (wsError || !workspace) {
      console.error('Workspace creation error:', wsError)
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 })
    }

    // Create user record (admin role since they're the first user)
    const { error: userError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        workspace_id: workspace.id,
        name: userName,
        email,
        role: 'admin',
      })

    if (userError) {
      // Rollback workspace
      await adminClient.from('workspaces').delete().eq('id', workspace.id)
      console.error('User creation error:', userError)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    return NextResponse.json({ workspace_id: workspace.id }, { status: 201 })
  } catch (err) {
    console.error('Workspace setup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
