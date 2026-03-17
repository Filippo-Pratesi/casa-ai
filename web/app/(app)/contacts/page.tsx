import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Users, Phone, Mail, Euro, Home, Cake } from 'lucide-react'
import { ExportContactsButton } from '@/components/contacts/export-contacts-button'

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100',
  seller: 'bg-green-50 text-green-700 border-green-100',
  renter: 'bg-purple-50 text-purple-700 border-purple-100',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-neutral-50 text-neutral-700 border-neutral-200',
}

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

function birthdayDaysLeft(dob: string | null): number | null {
  if (!dob) return null
  const today = new Date()
  const [, mm, dd] = dob.split('-').map(Number)
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
  const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
  return diff <= 7 ? diff : null
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
    .limit(100)

  const contacts = (data ?? []) as Contact[]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clienti</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {contacts.length > 0 ? `${contacts.length} contatti` : 'Nessun contatto ancora'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <ExportContactsButton />}
          <Button nativeButton={false} render={<Link href="/contacts/new" />} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Nuovo cliente
          </Button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <Users className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">Nessun cliente ancora</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">
            Aggiungi acquirenti, venditori e affittuari per tenere traccia dei tuoi clienti.
          </p>
          <Button nativeButton={false} render={<Link href="/contacts/new" />} className="mt-6 gap-2">
            <UserPlus className="h-4 w-4" />
            Aggiungi il primo cliente
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="group relative rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/contacts/${c.id}`} className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-900 truncate text-sm">{c.name}</h3>
                    {(c.preferred_cities ?? []).length > 0 && (
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">
                        {(c.preferred_cities ?? []).join(', ')}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(() => {
                      const days = birthdayDaysLeft(c.date_of_birth)
                      return days !== null ? (
                        <span className="flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                          <Cake className="h-2.5 w-2.5" />
                          {days === 0 ? 'Oggi!' : `tra ${days}g`}
                        </span>
                      ) : null
                    })()}
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[c.type]}`}>
                      {TYPE_LABELS[c.type]}
                    </span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1">
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span className="text-xs text-neutral-600 flex-1">{c.phone}</span>
                      <a
                        href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 text-[10px] font-medium leading-none"
                      >
                        WA
                      </a>
                    </div>
                  )}
                  {c.email && (
                    <p className="flex items-center gap-1.5 text-xs text-neutral-600 truncate">
                      <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                      {c.email}
                    </p>
                  )}
                </div>

                {/* Preferences (buyers/renters) */}
                {(c.budget_min || c.budget_max || c.min_rooms) && (
                  <div className="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                    {(c.budget_min || c.budget_max) && (
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3 text-neutral-400" />
                        {c.budget_min ? c.budget_min.toLocaleString('it-IT') : '0'}
                        {' — '}
                        {c.budget_max ? c.budget_max.toLocaleString('it-IT') : '∞'}
                      </span>
                    )}
                    {c.min_rooms && (
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3 text-neutral-400" />
                        min {c.min_rooms} loc.
                      </span>
                    )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
