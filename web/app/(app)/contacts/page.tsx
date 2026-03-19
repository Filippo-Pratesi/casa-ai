import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ContactsClient } from '@/components/contacts/contacts-client'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[]
  min_rooms: number | null
  date_of_birth: string | null
  created_at: string
  agent_name: string | null
  property_addresses: string[]
}

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  const isAdmin = profile?.role === 'admin' || profile?.role === 'group_admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('contacts')
    .select('id, name, email, phone, type, budget_min, budget_max, preferred_cities, min_rooms, date_of_birth, created_at, agent:users!contacts_agent_id_fkey(name)')
    .eq('workspace_id', profile?.workspace_id)
    .order('created_at', { ascending: false })
    .limit(500)

  const contactIds = ((data ?? []) as { id: string }[]).map(c => c.id)

  // Fetch property addresses linked to these contacts via property_contacts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: propContactsData } = contactIds.length > 0
    ? await (admin as any)
        .from('property_contacts')
        .select('contact_id, property:properties!property_contacts_property_id_fkey(address)')
        .in('contact_id', contactIds)
        .eq('workspace_id', profile?.workspace_id)
    : { data: [] }

  // Build contact_id → addresses map
  const propAddressMap = new Map<string, string[]>()
  for (const pc of ((propContactsData ?? []) as { contact_id: string; property: { address: string } | null }[])) {
    if (!pc.property?.address) continue
    const existing = propAddressMap.get(pc.contact_id) ?? []
    existing.push(pc.property.address)
    propAddressMap.set(pc.contact_id, existing)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts: Contact[] = (data ?? []).map((c: any) => ({
    ...c,
    agent_name: c.agent?.name ?? null,
    agent: undefined,
    property_addresses: propAddressMap.get(c.id) ?? [],
  }))

  return <ContactsClient contacts={contacts} isAdmin={isAdmin} />
}
