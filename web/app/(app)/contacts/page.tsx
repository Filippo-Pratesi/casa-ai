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
}

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user!.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  const isAdmin = profile?.role === 'admin' || profile?.role === 'group_admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('contacts')
    .select('id, name, email, phone, type, budget_min, budget_max, preferred_cities, min_rooms, date_of_birth, created_at')
    .eq('workspace_id', profile?.workspace_id)
    .order('created_at', { ascending: false })
    .limit(500)

  const contacts = (data ?? []) as Contact[]

  return <ContactsClient contacts={contacts} isAdmin={isAdmin} />
}
