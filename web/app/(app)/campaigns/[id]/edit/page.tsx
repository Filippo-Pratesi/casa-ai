import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { CampaignEditClient } from '@/components/campaigns/campaign-edit-client'

interface CampaignRecord {
  id: string
  subject: string
  body_text: string
  template: string
  recipient_filter: { type?: string; city?: string; mode?: string; contact_ids?: string[] } | null
  status: string
  workspace_id: string
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  // Fetch the specific campaign
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaignData } = await (admin as any)
    .from('campaigns')
    .select('id, subject, body_text, template, recipient_filter, status, workspace_id')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  const campaign = campaignData as CampaignRecord | null

  if (!campaign) notFound()
  if (campaign.status !== 'draft') redirect('/campaigns')

  // Fetch all cities for filter chips
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData } = await (admin as any)
    .from('contacts')
    .select('city_of_residence')
    .eq('workspace_id', profile.workspace_id)
    .not('city_of_residence', 'is', null)
    .neq('city_of_residence', '')

  const contacts = (contactsData ?? []) as { city_of_residence: string }[]
  const cities = [...new Set(contacts.map(c => c.city_of_residence).filter(Boolean) as string[])].sort()

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <CampaignEditClient
        campaign={campaign}
        cities={cities}
      />
    </div>
  )
}
