import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PlanCheckout } from '@/components/plans/plan-checkout'
import { PLAN_PRICES, PLAN_CONFIG } from '@/lib/plan-limits'
import { getTranslations } from '@/lib/i18n/server'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { t } = await getTranslations()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id, workspaces(plan, name, stripe_customer_id, created_at)')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/dashboard')

  const profile = profileData as {
    role: string
    workspace_id: string
    workspaces: {
      plan: string
      name: string
      stripe_customer_id: string | null
      created_at: string
    }
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'group_admin'
  if (!isAdmin) redirect('/dashboard')

  const currentPlan = profile.workspaces.plan
  const createdAt = new Date(profile.workspaces.created_at)
  const trialEnd = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
  const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const plans = [
    {
      id: 'starter' as const,
      name: 'Starter',
      iconKey: 'Zap',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      description: t('plans.starter.desc'),
      features: [
        t('plans.feat.agents3'),
        t('plans.feat.listingsUnlimited'),
        t('plans.feat.aiContent'),
        t('plans.feat.social'),
        t('plans.feat.pdf'),
        t('plans.feat.export'),
        t('plans.feat.storage1'),
        t('plans.feat.emailSupport'),
      ],
    },
    {
      id: 'agenzia' as const,
      name: 'Agenzia',
      iconKey: 'Building2',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      description: t('plans.agenzia.desc'),
      highlight: true,
      features: [
        t('plans.feat.agents15'),
        t('plans.feat.listingsUnlimited'),
        t('plans.feat.aiContent'),
        t('plans.feat.social'),
        t('plans.feat.pdf'),
        t('plans.feat.export'),
        t('plans.feat.emailCampaigns'),
        t('plans.feat.storage5'),
        t('plans.feat.prioritySupport'),
      ],
    },
    {
      id: 'network' as const,
      name: 'Network',
      iconKey: 'Globe',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      description: t('plans.network.desc'),
      features: [
        t('plans.feat.agentsUnlimited'),
        t('plans.feat.multiWorkspace'),
        t('plans.feat.listingsUnlimited'),
        t('plans.feat.aiContent'),
        t('plans.feat.social'),
        t('plans.feat.pdf'),
        t('plans.feat.export'),
        t('plans.feat.emailCampaigns'),
        t('plans.feat.storage20'),
        t('plans.feat.dedicatedSupport'),
      ],
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('plans.title')}</h1>
        <p className="text-muted-foreground">
          {currentPlan === 'trial'
            ? t('plans.trial').replace('{days}', String(daysLeft))
            : `${t('plans.current')}${PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG]?.name ?? currentPlan}`}
        </p>
      </div>

      <PlanCheckout
        plans={plans}
        currentPlan={currentPlan}
        workspaceId={profile.workspace_id}
        prices={PLAN_PRICES}
      />

      <p className="text-center text-xs text-muted-foreground">{t('plans.footer')}</p>
    </div>
  )
}
