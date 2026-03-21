import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/contacts/contact-form'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function NewContactPage() {
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
  const { data: agentsData } = await (admin as any).from('users').select('id, name').eq('workspace_id', profile!.workspace_id).order('name')
  const agents = (agentsData ?? []) as { id: string; name: string }[]

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href="/contacts" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Clienti</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuovo cliente</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aggiungi un acquirente, venditore o affittuario al tuo database clienti.
        </p>
      </div>

      <ContactForm mode="create" isAdmin={isAdmin} agents={agents} />
    </div>
  )
}
