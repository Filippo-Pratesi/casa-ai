import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/contacts/contact-form'

export default async function EditContactPage({
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
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string } | null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', profile?.workspace_id)
    .single()

  if (error || !data) notFound()

  const contact = data as {
    name: string; type: string; roles: string[] | null; email: string | null; phone: string | null
    city_of_residence: string | null; address_of_residence: string | null
    codice_fiscale: string | null; partita_iva: string | null
    professione: string | null; data_nascita: string | null
    notes: string | null; budget_min: number | null; budget_max: number | null
    preferred_cities: string[]; preferred_types: string[]
    min_sqm: number | null; min_rooms: number | null
  }

  const defaultValues = {
    name: contact.name,
    types: (contact.roles && contact.roles.length > 0) ? contact.roles : [contact.type],
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    city_of_residence: contact.city_of_residence ?? '',
    address_of_residence: contact.address_of_residence ?? '',
    codice_fiscale: contact.codice_fiscale ?? '',
    partita_iva: contact.partita_iva ?? '',
    professione: contact.professione ?? '',
    data_nascita: contact.data_nascita ?? '',
    notes: contact.notes ?? '',
    budget_min: contact.budget_min?.toString() ?? '',
    budget_max: contact.budget_max?.toString() ?? '',
    preferred_cities: (contact.preferred_cities ?? []).join(', '),
    preferred_types: contact.preferred_types ?? [],
    min_sqm: contact.min_sqm?.toString() ?? '',
    min_rooms: contact.min_rooms?.toString() ?? '',
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href={`/contacts/${id}`} />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Dettaglio cliente</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifica cliente</h1>
        <p className="text-muted-foreground text-sm mt-1">Aggiorna i dati e le preferenze di ricerca.</p>
      </div>

      <ContactForm mode="edit" contactId={id} defaultValues={defaultValues} />
    </div>
  )
}
