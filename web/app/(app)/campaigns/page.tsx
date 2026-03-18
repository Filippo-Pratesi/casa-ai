import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Mail, Send, Clock, AlertCircle, Sparkles, BarChart2, TrendingUp, Info, MessageCircle } from 'lucide-react'
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
  channel: 'email' | 'whatsapp'
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
    .select('id, subject, status, sent_count, opened_count, created_at, sent_at, template, channel')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  const campaigns = (data ?? []) as Campaign[]

  const statusConfig = {
    draft: { label: t('campaigns.status.draft'), color: 'bg-muted text-muted-foreground', icon: Clock },
    sending: { label: t('campaigns.status.sending'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Send },
    sent: { label: t('campaigns.status.sent'), color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', icon: Send },
    failed: { label: t('campaigns.status.failed'), color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: AlertCircle },
  }

  const dateLocale = locale === 'en' ? 'en-GB' : 'it-IT'

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count ?? 0), 0)
  const totalDrafts = campaigns.filter(c => c.status === 'draft').length
  const totalSentCampaigns = campaigns.filter(c => c.status === 'sent').length
  const avgOpenRate = totalSentCampaigns > 0
    ? Math.round(campaigns.filter(c => c.status === 'sent' && c.sent_count > 0).reduce((acc, c) => acc + (c.opened_count / c.sent_count) * 100, 0) / Math.max(totalSentCampaigns, 1))
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between animate-in-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight leading-none">{t('campaigns.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('campaigns.subtitle')}</p>
        </div>
        <Link href="/campaigns/new" className="btn-ai inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          {t('campaigns.new')}
        </Link>
      </div>

      {/* Stats bar — only when there are campaigns */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in-2">
          {[
            { label: 'Totale', value: campaigns.length, icon: Mail, info: undefined },
            { label: 'Inviate', value: totalSentCampaigns, icon: Send, info: undefined },
            { label: 'Bozze', value: totalDrafts, icon: Clock, info: undefined },
            { label: 'Tasso apertura', value: avgOpenRate !== null ? `${avgOpenRate}%` : '—', icon: BarChart2, info: 'Percentuale di destinatari che hanno aperto l\'email almeno una volta, sul totale degli invii.' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.info && (
                  <span title={stat.info} className="cursor-help ml-auto">
                    <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                  </span>
                )}
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        /* Compelling empty state */
        <div className="animate-in-2 relative overflow-hidden rounded-3xl border border-[oklch(0.57_0.20_33/0.25)] bg-gradient-to-br from-[oklch(0.97_0.04_33)] via-[oklch(0.975_0.025_45)] to-[oklch(0.97_0.03_188)] p-10 text-center">
          {/* Ambient radial glows */}
          <div className="absolute top-0 left-1/4 h-48 w-48 rounded-full bg-[oklch(0.57_0.20_33/0.10)] blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-[oklch(0.66_0.15_188/0.08)] blur-3xl pointer-events-none" />

          <div className="relative">
            {/* Icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-xl shadow-[oklch(0.57_0.20_33/0.35)]">
              <Sparkles className="h-8 w-8 text-white" />
            </div>

            <h2 className="text-xl font-extrabold tracking-tight">Lancia la tua prima campagna AI</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Raggiungi i tuoi contatti con email personalizzate generate dall&apos;intelligenza artificiale di CasaAI.
            </p>

            {/* Feature highlights */}
            <div className="mt-6 flex items-center justify-center gap-6 flex-wrap">
              {[
                { icon: Mail, label: 'Email personalizzate' },
                { icon: TrendingUp, label: 'Tasso apertura tracciato' },
                { icon: BarChart2, label: 'Analytics integrati' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 text-[oklch(0.57_0.20_33)]" />
                  {item.label}
                </div>
              ))}
            </div>

            <Link href="/campaigns/new" className="btn-ai mt-7 inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              Crea la prima campagna
            </Link>
          </div>
        </div>
      ) : (
        <div className="animate-in-2 space-y-3">
          {campaigns.map((c, idx) => {
            const cfg = statusConfig[c.status] ?? statusConfig.draft
            const StatusIcon = cfg.icon
            const isDraft = c.status === 'draft'
            const openRate = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : null

            const cardContent = (
              <>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  c.channel === 'whatsapp'
                    ? 'bg-gradient-to-br from-green-100 to-green-50 ring-green-300/40 dark:from-green-900/20 dark:to-green-900/10 dark:ring-green-700/30'
                    : 'bg-gradient-to-br from-[oklch(0.57_0.20_33/0.12)] to-[oklch(0.66_0.15_188/0.12)] ring-[oklch(0.57_0.20_33/0.2)]'
                }`}>
                  {c.channel === 'whatsapp'
                    ? <MessageCircle className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                    : <Mail className="h-4.5 w-4.5 text-[oklch(0.57_0.20_33)]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold tracking-tight truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.sent_at
                      ? `${t('campaigns.sentOn')} ${new Date(c.sent_at).toLocaleDateString(dateLocale)}`
                      : `${t('campaigns.createdOn')} ${new Date(c.created_at).toLocaleDateString(dateLocale)}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${openRate ?? 0}%` }} />
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {openRate !== null ? `${openRate}% apertura` : 'N/A'}
                      <span title="Percentuale di destinatari che hanno aperto l'email almeno una volta." className="cursor-help">
                        <Info className="h-3 w-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Inline analytics preview */}
                  {c.status === 'sent' && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{c.sent_count}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('campaigns.sentCount')}</p>
                      </div>
                      {openRate !== null && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{openRate}%</p>
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                            Apertura
                            <span title="Percentuale di destinatari che hanno aperto l'email almeno una volta." className="cursor-help">
                              <Info className="h-2.5 w-2.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <Badge className={`flex items-center gap-1 text-xs font-medium border-0 ${cfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>
              </>
            )
            return isDraft ? (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}/edit`}
                className={`animate-in-${Math.min(idx + 3, 8)} card-lift flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:bg-muted/40`}
              >
                {cardContent}
              </Link>
            ) : (
              <div key={c.id} className={`animate-in-${Math.min(idx + 3, 8)} card-lift flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4`}>
                {cardContent}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
