import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ProposalForm } from '@/components/proposals/proposal-form'

export default async function NuovaPropostaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, name, workspaces(name)')
    .eq('id', user.id)
    .single()
  const profile = profileData as {
    workspace_id: string
    name: string
    workspaces: { name: string }
  } | null
  if (!profile) redirect('/login')

  const anno = new Date().getFullYear()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contactsRes, listingsRes, nextNumRes] = await Promise.all([
    (admin as any)
      .from('contacts')
      .select('id, name, email, phone, address, city_of_residence')
      .eq('workspace_id', profile.workspace_id)
      .order('name'),
    (admin as any)
      .from('listings')
      .select('id, address, city, property_type, price')
      .eq('workspace_id', profile.workspace_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
    (admin as any).rpc('next_proposal_number', { p_workspace_id: profile.workspace_id, p_anno: anno }),
  ])

  const contacts = (contactsRes.data ?? []) as {
    id: string; name: string; email: string | null; phone: string | null; address: string | null; city_of_residence: string | null
  }[]
  const listings = (listingsRes.data ?? []) as { id: string; address: string; city: string; property_type: string; price: number | null }[]
  const progressivo = (nextNumRes.data as number) ?? 1
  const nextNumber = {
    anno,
    progressivo,
    numero_proposta: `PA-${anno}/${String(progressivo).padStart(3, '0')}`,
  }

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/proposte"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuova proposta d&apos;acquisto</h1>
          <p className="text-sm text-muted-foreground">{nextNumber.numero_proposta}</p>
        </div>
      </div>
      <ProposalForm
        contacts={contacts}
        listings={listings}
        nextNumber={nextNumber}
        workspaceName={profile.workspaces?.name ?? 'CasaAI'}
        agentName={profile.name}
        mode="create"
      />
    </div>
  )
}
