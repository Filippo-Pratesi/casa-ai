import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TeamOverview } from '@/components/admin/team-overview'
import type { Listing, User } from '@/lib/supabase/types'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; workspace_id: string } | null
  if (!profile) redirect('/dashboard')

  // Fetch all workspace members
  const { data: membersData } = await admin
    .from('users')
    .select('*')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: true })

  const members = (membersData ?? []) as User[]

  // Fetch all listings (all time)
  const { data: allListings } = await admin
    .from('listings')
    .select('agent_id, created_at, generated_content')
    .eq('workspace_id', profile.workspace_id)

  const allListingsList = (allListings ?? []) as Pick<Listing, 'agent_id' | 'generated_content' | 'created_at'>[]

  // Fetch all contacts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allContacts } = await (admin as any)
    .from('contacts')
    .select('agent_id, created_at')
    .eq('workspace_id', profile.workspace_id)

  const allContactsList = (allContacts ?? []) as { agent_id: string; created_at: string }[]

  // Fetch sold listings (archived_listings where sold=true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: soldListings } = await (admin as any)
    .from('archived_listings')
    .select('sold_by_agent_id, agent_id, archived_at')
    .eq('workspace_id', profile.workspace_id)
    .eq('sold', true)

  const soldListingsList = (soldListings ?? []) as {
    sold_by_agent_id: string | null
    agent_id: string
    archived_at: string
  }[]

  // Build per-agent raw data for client component
  const agents = members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    joinedAt: member.created_at,
    listings: allListingsList
      .filter((l) => l.agent_id === member.id)
      .map((l) => ({
        created_at: l.created_at.slice(0, 7), // YYYY-MM
        has_content: l.generated_content != null,
      })),
    contacts: allContactsList
      .filter((c) => c.agent_id === member.id)
      .map((c) => ({ created_at: c.created_at.slice(0, 7) })),
    // sold_by_agent_id takes priority; fall back to agent_id for legacy records
    soldListings: soldListingsList
      .filter((s) => (s.sold_by_agent_id ?? s.agent_id) === member.id)
      .map((s) => ({ archived_at: s.archived_at.slice(0, 7) })),
  }))

  return (
    <TeamOverview
      agents={agents}
      isAdmin={profile.role === 'admin'}
      currentUserId={user.id}
    />
  )
}
