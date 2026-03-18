import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { InvoiceForm } from '@/components/contabilita/invoice-form'

type Params = { params: Promise<{ id: string }> }

export default async function ModificaFatturaPage({ params }: Params) {
  const { id } = await params
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invoice } = await (admin as any)
    .from('invoices')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)
    .single()

  if (!invoice) notFound()
  if (invoice.status !== 'bozza') redirect(`/contabilita/${id}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contactsRes, listingsRes] = await Promise.all([
    (admin as any).from('contacts').select('id, name, email, phone, city_of_residence').eq('workspace_id', profile.workspace_id).order('name'),
    (admin as any).from('listings').select('id, address, city').eq('workspace_id', profile.workspace_id).eq('status', 'published').order('created_at', { ascending: false }),
  ])

  const contacts = (contactsRes.data ?? []) as { id: string; name: string; email: string | null; phone: string | null; city_of_residence: string | null }[]
  const listings = (listingsRes.data ?? []) as { id: string; address: string; city: string }[]

  return (
    <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link href={`/contabilita/${id}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Modifica fattura</h1>
          <p className="text-sm text-muted-foreground">Fattura n. {invoice.numero_fattura}</p>
        </div>
      </div>
      <InvoiceForm contacts={contacts} listings={listings} workspaceName={profile.workspaces?.name} mode="edit" initialData={invoice} invoiceId={id} />
    </div>
  )
}
