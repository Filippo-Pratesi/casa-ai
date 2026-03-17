'use client'

import { useState } from 'react'
import { Check, Loader2, Zap, Building2, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PLAN_PRICES } from '@/lib/plan-limits'

const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Building2,
  Globe,
}

interface Plan {
  id: 'starter' | 'agenzia' | 'network'
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
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex justify-center">
        <div className="flex rounded-xl border border-border bg-card overflow-hidden p-0.5 gap-0.5">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              billing === 'monthly' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Mensile
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`flex items-center gap-2 px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              billing === 'annual' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Annuale
            <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${
              billing === 'annual' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
            }`}>-5%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const price = prices[plan.id]
          const monthlyPrice = billing === 'annual' ? price.annual : price.monthly
          const isCurrent = currentPlan === plan.id
          const Icon = ICON_MAP[plan.iconKey] ?? Zap

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 p-6 bg-card ${
                plan.highlight
                  ? 'border-[oklch(0.57_0.20_33/0.6)] shadow-lg shadow-[oklch(0.57_0.20_33/0.15)]'
                  : 'border-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                    Più popolare
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.bg}`}>
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                </div>
                <div>
                  <h3 className="font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">€{monthlyPrice}</span>
                  <span className="text-sm text-muted-foreground">/mese</span>
                </div>
                {billing === 'annual' && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Fatturato €{monthlyPrice * 12}/anno
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="flex items-center justify-center rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  Piano attuale
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] text-white hover:opacity-90'
                      : 'bg-[oklch(0.57_0.20_33)] text-white hover:bg-[oklch(0.52_0.20_33)]'
                  } disabled:opacity-60`}
                >
                  {loading === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading === plan.id ? 'Reindirizzo…' : 'Attiva piano'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
