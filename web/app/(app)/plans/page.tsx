import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PlanCheckout } from '@/components/plans/plan-checkout'
import { PLAN_PRICES, PLAN_CONFIG } from '@/lib/plan-limits'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  // Only admin/group_admin can manage plans
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
      description: 'Per agenti indipendenti e piccoli studi',
      features: [
        'Fino a 3 agenti',
        'Annunci illimitati',
        'Generazione AI di contenuti',
        'Pubblicazione social (IG/FB)',
        'PDF brochure',
        'Export portali',
        '1 GB di storage',
        'Supporto email',
      ],
    },
    {
      id: 'agenzia' as const,
      name: 'Agenzia',
      iconKey: 'Building2',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      description: 'Per filiali con team di agenti',
      highlight: true,
      features: [
        'Fino a 15 agenti',
        'Annunci illimitati',
        'Generazione AI di contenuti',
        'Pubblicazione social (IG/FB)',
        'PDF brochure',
        'Export portali',
        'Campagne email ai clienti',
        '5 GB di storage',
        'Supporto prioritario',
      ],
    },
    {
      id: 'network' as const,
      name: 'Network',
      iconKey: 'Globe',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      description: 'Per gruppi multi-filiale',
      features: [
        'Agenti illimitati',
        'Workspace multipli',
        'Annunci illimitati',
        'Generazione AI di contenuti',
        'Pubblicazione social (IG/FB)',
        'PDF brochure',
        'Export portali',
        'Campagne email ai clienti',
        '20 GB di storage',
        'Supporto prioritario dedicato',
      ],
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Scegli il piano</h1>
        <p className="text-neutral-500">
          {currentPlan === 'trial'
            ? `Sei in periodo di prova — ${daysLeft} giorni rimanenti`
            : `Piano attuale: ${PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG]?.name ?? currentPlan}`}
        </p>
      </div>

      {/* Billing toggle + plans */}
      <PlanCheckout
        plans={plans}
        currentPlan={currentPlan}
        workspaceId={profile.workspace_id}
        prices={PLAN_PRICES}
      />

      {/* Footer note */}
      <p className="text-center text-xs text-neutral-400">
        IVA esclusa · Fatturazione mensile o annuale · Disdetta in qualsiasi momento
        · Tutte le transazioni sono gestite in modo sicuro da Stripe
      </p>
    </div>
  )
}
