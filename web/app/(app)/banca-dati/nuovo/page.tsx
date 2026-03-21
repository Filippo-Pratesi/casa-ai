import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NuovoImmobileClient } from '@/components/banca-dati/nuovo-immobile-client'

export const metadata = { title: 'Nuovo Immobile — Banca Dati' }

export default async function NuovoImmobilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, name, role')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/auth/setup')

  const profile = profileData as { workspace_id: string; name: string; role: string }
  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'

  // Load agent's default zones
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentZonesData } = await (admin as any)
    .from('agent_zones')
    .select('zones(id, name, city, sub_zones(id, name))')
    .eq('agent_id', user.id)
    .eq('workspace_id', profile.workspace_id)

  const agentZones = ((agentZonesData ?? []) as { zones: { name: string; city: string } | null }[])
    .map((az) => az.zones)
    .filter(Boolean) as { name: string; city: string }[]

  // Load workspace agents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentsData } = await (admin as any).from('users').select('id, name').eq('workspace_id', profile.workspace_id).order('name')
  const agents = (agentsData ?? []) as { id: string; name: string }[]

  return (
    <NuovoImmobileClient
      agentDefaultZones={agentZones}
      agents={agents}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  )
}
