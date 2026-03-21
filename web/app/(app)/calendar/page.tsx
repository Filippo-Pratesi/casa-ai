import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CalendarClient } from '@/components/calendar/calendar-client'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>
}) {
  const { agentId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role, name')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string; name: string } | null
  if (!profile) redirect('/dashboard')

  // Fetch listings and contacts in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: listingsData }, { data: contactsData }] = await Promise.all([
    admin
      .from('listings')
      .select('id, address, city')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: false })
      .limit(100),
    (admin as any)
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', profile.workspace_id)
      .order('name', { ascending: true })
      .limit(200),
  ])

  const listings = (listingsData ?? []) as { id: string; address: string; city: string }[]
  const contacts = (contactsData ?? []) as { id: string; name: string }[]

  // If agentId filter: resolve agent name for the header (admins only)
  let filterAgentName: string | undefined
  let agents: { id: string; name: string }[] = []

  const [agentRes, filterRes] = await Promise.all([
    admin
      .from('users')
      .select('id, name')
      .eq('workspace_id', profile.workspace_id)
      .order('name', { ascending: true }),
    agentId && (profile.role === 'admin' || profile.role === 'group_admin')
      ? admin.from('users').select('name').eq('id', agentId).single()
      : Promise.resolve({ data: null }),
  ])
  agents = (agentRes.data ?? []) as { id: string; name: string }[]
  filterAgentName = (filterRes.data as { name: string } | null)?.name

  return (
    <CalendarClient
      userId={user.id}
      role={profile.role}
      listings={listings}
      contacts={contacts}
      agents={agents.length > 1 ? agents : undefined}
      filterAgentId={(profile.role === 'admin' || profile.role === 'group_admin') ? agentId : undefined}
      filterAgentName={filterAgentName}
    />
  )
}
