import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Mail, Send, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Campaign {
  id: string
  subject: string
  status: 'draft' | 'sending' | 'sent' | 'failed'
  sent_count: number
  opened_count: number
  created_at: string
  sent_at: string | null
  template: string
}

const STATUS_CONFIG = {
  draft: { label: 'Bozza', color: 'bg-neutral-100 text-neutral-600', icon: Clock },
  sending: { label: 'In invio', color: 'bg-blue-100 text-blue-700', icon: Send },
  sent: { label: 'Inviata', color: 'bg-green-100 text-green-700', icon: Send },
  failed: { label: 'Errore', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

export default async function CampaignsPage() {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('campaigns')
    .select('id, subject, status, sent_count, opened_count, created_at, sent_at, template')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  const campaigns = (data ?? []) as Campaign[]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campagne email</h1>
          <p className="text-sm text-neutral-500 mt-1">Invia comunicazioni ai tuoi clienti</p>
        </div>
        <Button nativeButton={false} render={<Link href="/campaigns/new" />} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuova campagna
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Mail className="h-10 w-10 text-neutral-300 mb-3" />
          <p className="font-medium text-neutral-700">Nessuna campagna ancora</p>
          <p className="text-sm text-neutral-400 mt-1 mb-5">Crea la tua prima campagna email</p>
          <Button nativeButton={false} render={<Link href="/campaigns/new" />} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova campagna
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
            const StatusIcon = cfg.icon
            return (
              <Card key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <Mail className="h-4 w-4 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{c.subject}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {c.sent_at
                      ? `Inviata il ${new Date(c.sent_at).toLocaleDateString('it-IT')}`
                      : `Creata il ${new Date(c.created_at).toLocaleDateString('it-IT')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.status === 'sent' && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-800">{c.sent_count}</p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wide">Inviati</p>
                    </div>
                  )}
                  <Badge className={`flex items-center gap-1 text-xs font-medium border-0 ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
