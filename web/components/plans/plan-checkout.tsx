'use client'

import { useState } from 'react'
import { Check, Loader2, Zap, Building2, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PLAN_PRICES } from '@/lib/plan-limits'
import { useI18n } from '@/lib/i18n/context'

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Building2,
  Globe,
}

interface Plan {
  id: 'starter' | 'growth' | 'network'
  name: string
  iconKey: string
  color: string
  bg: string
  border: string
  description: string
  highlight?: boolean
  features: string[]
}

interface PlanCheckoutProps {
  plans: Plan[]
  currentPlan: string
  workspaceId: string
  prices: typeof PLAN_PRICES
}

export function PlanCheckout({ plans, currentPlan, workspaceId, prices }: PlanCheckoutProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const { t } = useI18n()

  async function handleUpgrade(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, billing, workspace_id: workspaceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // silent
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="bg-muted rounded-lg p-1 flex items-center gap-1">
          <button onClick={() => setBilling('monthly')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t('plans.billing.monthly')}
          </button>
          <button onClick={() => setBilling('annual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'annual' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {t('plans.billing.annual')} <span className="text-xs text-green-600 font-medium ml-1">-17%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {plans.map((plan, idx) => {
          const price = prices[plan.id]
          const monthlyPrice = billing === 'annual' ? price.annual : price.monthly
          const isCurrent = currentPlan === plan.id
          const Icon = ICON_MAP[plan.iconKey] ?? Zap

          return (
            <div
              key={plan.id}
              className={`animate-in-${idx + 2} relative flex flex-col rounded-2xl p-6 bg-card card-lift ${
                isCurrent
                  ? 'ring-2 ring-[oklch(0.57_0.20_33)] ring-offset-2 border-2 border-[oklch(0.57_0.20_33/0.3)]'
                  : plan.highlight
                    ? 'plan-popular-glow border-2 border-transparent shadow-xl shadow-[oklch(0.57_0.20_33/0.2)]'
                    : 'border-2 border-border'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="rounded-full bg-[oklch(0.57_0.20_33)] px-4 py-1 text-[11px] font-bold text-white shadow-md uppercase tracking-wider">
                    Piano attuale
                  </span>
                </div>
              )}
              {!isCurrent && plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] px-4 py-1 text-[11px] font-bold text-white shadow-md shadow-[oklch(0.57_0.20_33/0.3)] uppercase tracking-wider">
                    {t('plans.mostPopular')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${plan.bg} shadow-sm`}>
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                </div>
                <div>
                  <h3 className="font-extrabold tracking-tight">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">€{monthlyPrice}</span>
                  <span className="text-sm text-muted-foreground">{t('plans.perMonth')}</span>
                </div>
                {billing === 'annual' && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    {t('plans.billedAnnual').replace('{amount}', String(monthlyPrice * 12))}
                  </p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.highlight ? 'text-[oklch(0.57_0.20_33)]' : 'text-green-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                  {t('plans.currentPlan')}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    plan.highlight
                      ? 'btn-ai'
                      : 'bg-[oklch(0.57_0.20_33)] text-white hover:bg-[oklch(0.52_0.20_33)] hover:shadow-md'
                  } disabled:opacity-60`}
                >
                  {loading === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading === plan.id ? t('plans.redirecting') : t('plans.activate')}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
