import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, Mail, FileText, UserRound, TrendingUp, Home, Euro, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarClient } from '@/components/calendar/calendar-client'

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Admin Gruppo',
  admin: 'Admin',
  agent: 'Agente',
}

const ROLE_COLORS: Record<string, string> = {
  group_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  agent: 'bg-neutral-50 text-neutral-600 border-neutral-200',
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

const PROP_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}


export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: agentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Verify the viewer is admin/group_admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: viewerProfile } = await (admin as any)
    .from('users')
    .select('role, workspace_id')
    .eq('id', user.id)
    .single()

  const vp = viewerProfile as { role: string; workspace_id: string } | null
  if (!vp || (vp.role !== 'admin' && vp.role !== 'group_admin')) {
    redirect('/dashboard')
  }

  // Fetch target agent (must be in same workspace)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agent } = await (admin as any)
    .from('users')
    .select('id, name, email, role, created_at, workspace_id, phone, avatar_url')
    .eq('id', agentId)
    .single()

  const agentData = agent as { id: string; name: string; email: string; role: string; created_at: string; workspace_id: string; phone: string | null; avatar_url: string | null } | null
  if (!agentData || agentData.workspace_id !== vp!.workspace_id) notFound()

  // Fetch their listings
  const { data: listingsData } = await admin
    .from('listings')
    .select('id, address, city, price, property_type, sqm, rooms, generated_content, created_at, tone')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  const listings = (listingsData ?? []) as {
    id: string; address: string; city: string; price: number; property_type: string
    sqm: number; rooms: number; generated_content: unknown; created_at: string; tone: string
  }[]

  // Fetch their contacts (for profile display)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData } = await (admin as any)
    .from('contacts')
    .select('id, name, email, phone, type, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(50)

  const contacts = (contactsData ?? []) as {
    id: string; name: string; email: string | null; phone: string | null; type: string; created_at: string
  }[]

  // Fetch all workspace listings + contacts for the calendar's add-appointment dropdowns
  const { data: wsListingsData } = await admin
    .from('listings')
    .select('id, address, city')
    .eq('workspace_id', vp!.workspace_id)
    .order('created_at', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wsContactsData } = await (admin as any)
    .from('contacts')
    .select('id, name')
    .eq('workspace_id', vp!.workspace_id)
    .order('name', { ascending: true })
    .limit(200)

  const wsListings = (wsListingsData ?? []) as { id: string; address: string; city: string }[]
  const wsContacts = (wsContactsData ?? []) as { id: string; name: string }[]

  const joinedDate = new Date(agentData.created_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Nav */}
      <div className="flex items-center gap-2">
        <Button nativeButton={false} render={<Link href="/admin" />} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-neutral-500">Team</span>
      </div>

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white text-xl font-bold overflow-hidden">
          {agentData.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={agentData.avatar_url} alt={agentData.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(agentData.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{agentData.name}</h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[agentData.role]}`}>
              {ROLE_LABELS[agentData.role] ?? agentData.role}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {agentData.email}
            </span>
            {agentData.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {agentData.phone}
              </span>
            )}
            <span>Nel team dal {joinedDate}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{listings.length}</p>
                <p className="text-xs text-neutral-500">Annunci totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <UserRound className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-neutral-500">Clienti totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{listings.filter(l => l.generated_content).length}</p>
                <p className="text-xs text-neutral-500">Contenuti AI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <CalendarClient
        userId={agentData.id}
        role={vp!.role}
        listings={wsListings}
        contacts={wsContacts}
        filterAgentId={agentId}
        filterAgentName={agentData.name}
      />

      {/* Recent listings */}
      {listings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4 text-neutral-400" />
              Annunci recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100">
              {listings.slice(0, 10).map((l) => (
                <Link
                  key={l.id}
                  href={`/listing/${l.id}`}
                  className="flex items-start gap-4 py-3 hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{l.address}, {l.city}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 flex-wrap">
                      <span>{PROP_LABELS[l.property_type] ?? l.property_type}</span>
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {l.price.toLocaleString('it-IT')}
                      </span>
                      <span>{l.sqm} m² · {l.rooms} loc.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {l.generated_content ? (
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-medium">Generato</span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 text-neutral-500 px-2 py-0.5 text-[10px] font-medium">Bozza</span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {new Date(l.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent contacts */}
      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-neutral-400" />
              Clienti recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-neutral-100">
              {contacts.slice(0, 10).map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="flex items-start gap-4 py-3 hover:bg-neutral-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-4">{TYPE_LABELS[c.type] ?? c.type}</Badge>
                      {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
