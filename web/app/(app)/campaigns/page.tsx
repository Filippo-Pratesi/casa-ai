import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Mail, Send, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getTranslations } from '@/lib/i18n/server'

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

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { t, locale } = await getTranslations()

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

  const statusConfig = {
    draft: { label: t('campaigns.status.draft'), color: 'bg-muted text-muted-foreground', icon: Clock },
    sending: { label: t('campaigns.status.sending'), color: 'bg-blue-100 text-blue-700', icon: Send },
    sent: { label: t('campaigns.status.sent'), color: 'bg-green-100 text-green-700', icon: Send },
    failed: { label: t('campaigns.status.failed'), color: 'bg-red-100 text-red-700', icon: AlertCircle },
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'it-IT'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('campaigns.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('campaigns.subtitle')}</p>
        </div>
        <Link href="/campaigns/new" className="btn-ai inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          {t('campaigns.new')}
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="mesh-bg flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <p className="font-semibold">{t('campaigns.empty.title')}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">{t('campaigns.empty.body')}</p>
          <Link href="/campaigns/new" className="btn-ai inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            {t('campaigns.new')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = statusConfig[c.status] ?? statusConfig.draft
            const StatusIcon = cfg.icon
            return (
              <div key={c.id} className="card-lift flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.12)] to-[oklch(0.66_0.15_188/0.12)] ring-1 ring-[oklch(0.57_0.20_33/0.2)]">
                  <Mail className="h-4 w-4 text-[oklch(0.57_0.20_33)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.sent_at
                      ? `${t('campaigns.sentOn')} ${new Date(c.sent_at).toLocaleDateString(dateLocale)}`
                      : `${t('campaigns.createdOn')} ${new Date(c.created_at).toLocaleDateString(dateLocale)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.status === 'sent' && (
                    <div className="text-right">
                      <p className="text-sm font-semibold">{c.sent_count}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('campaigns.sentCount')}</p>
                    </div>
                  )}
                  <Badge className={`flex items-center gap-1 text-xs font-medium border-0 ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
