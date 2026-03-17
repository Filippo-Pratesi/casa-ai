import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { CampaignComposer } from '@/components/campaigns/campaign-composer'

export default async function NewCampaignPage() {
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
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) redirect('/dashboard')

  // Fetch contacts with valid email for campaign targeting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData } = await (admin as any)
    .from('contacts')
    .select('type, city_of_residence')
    .eq('workspace_id', profile.workspace_id)
    .not('email', 'is', null)
    .neq('email', '')

  const contacts = (contactsData ?? []) as { type: string; city_of_residence: string | null }[]
  const cities = [...new Set(contacts.map(c => c.city_of_residence).filter(Boolean) as string[])].sort()
  const totalContacts = contacts.length

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <CampaignComposer cities={cities} totalContacts={totalContacts} />
    </div>
  )
}
