import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import type { Listing } from '@/lib/supabase/types'

type ListingWithAgent = Listing & { agent: { name: string } | null }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; workspace_id: string } | null

  const { data: listingsData } = await admin
    .from('listings')
    .select('*, agent:users!agent_id(name)')
    .eq('workspace_id', profile?.workspace_id ?? '')
    .order('created_at', { ascending: false })
    .limit(500)

  const listings = (listingsData ?? []) as ListingWithAgent[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ count: contactsCount }, { count: appointmentsCount }, { count: bancaDatiCount }] = await Promise.all([
    (admin as any).from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', profile?.workspace_id ?? ''),
    (admin as any).from('appointments').select('id', { count: 'exact', head: true }).eq('workspace_id', profile?.workspace_id ?? '').gte('starts_at', new Date().toISOString()).neq('status', 'cancelled'),
    (admin as any).from('properties').select('id', { count: 'exact', head: true }).eq('workspace_id', profile?.workspace_id ?? ''),
  ])

  const isAdmin = profile?.role === 'admin' || profile?.role === 'group_admin'

  return (
    <DashboardClient
      listings={listings.map(l => ({
        id: l.id,
        address: l.address,
        city: l.city,
        price: l.price,
        sqm: l.sqm,
        rooms: l.rooms,
        property_type: l.property_type,
        tone: l.tone,
        floor: l.floor ?? null,
        photos_urls: Array.isArray(l.photos_urls) ? l.photos_urls as string[] : null,
        generated_content: l.generated_content,
        created_at: l.created_at,
        agent: l.agent,
      }))}
      stats={{
        listings: listings.length,
        contacts: (contactsCount as number | null) ?? 0,
        appointments: (appointmentsCount as number | null) ?? 0,
        aiContent: listings.filter(l => l.generated_content).length,
        bancaDati: (bancaDatiCount as number | null) ?? 0,
      }}
      isAdmin={isAdmin}
    />
  )
}
