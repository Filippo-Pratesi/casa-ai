import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Recovery page: reached when an authenticated user has no public.users profile.
 * Uses service role client to bypass RLS for all operations, since the anon client
 * cannot read the users table until the profile exists (recursive RLS policy issue).
 */
export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service role to bypass RLS — anon client cannot reliably read users table
  // when the user's own profile doesn't exist yet (recursive policy returns null)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if profile already exists
  const { data: existing } = await adminClient
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) redirect('/dashboard')

  // Profile missing — create workspace + user
  const name = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Utente'
  const officeName = user.user_metadata?.office_name ?? 'Il mio studio'

  const { data: workspace, error: wsError } = await adminClient
    .from('workspaces')
    .insert({ name: officeName, tone_default: 'standard', plan: 'trial' })
    .select()
    .single()

  if (wsError || !workspace) {
    console.error('Setup: workspace creation failed', wsError)
    // Show error page rather than loop
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2>Errore configurazione account</h2>
        <p>Impossibile creare il workspace. Contatta il supporto.</p>
        <pre style={{ fontSize: 12, color: '#666' }}>{wsError?.message}</pre>
      </div>
    )
  }

  const { error: userError } = await adminClient.from('users').insert({
    id: user.id,
    workspace_id: workspace.id,
    name,
    email: user.email!,
    role: 'admin',
  })

  if (userError) {
    console.error('Setup: user profile creation failed', userError)
    // Clean up orphan workspace
    await adminClient.from('workspaces').delete().eq('id', workspace.id)
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h2>Errore configurazione account</h2>
        <p>Impossibile creare il profilo utente. Contatta il supporto.</p>
        <pre style={{ fontSize: 12, color: '#666' }}>{userError.message}</pre>
      </div>
    )
  }

  redirect('/dashboard')
}
