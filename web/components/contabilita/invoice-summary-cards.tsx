import { TrendingUp, Clock, AlertCircle, Timer, Receipt, CalendarClock } from 'lucide-react'
import { formatCurrency } from './invoice-totals-calculator'
import type { InvoiceStats } from '@/app/api/invoices/stats/route'

interface SummaryCardProps {
  stats: InvoiceStats
}

export function InvoiceSummaryCards({ stats }: SummaryCardProps) {
  const cards = [
    {
      label: 'Fatturato YTD',
      value: formatCurrency(stats.fatturato_ytd),
      sub: `anno in corso`,
      icon: TrendingUp,
      colorFrom: 'from-green-100 dark:from-green-900/30',
      colorTo: 'to-emerald-50 dark:to-emerald-900/20',
      iconClass: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'In attesa',
      value: formatCurrency(stats.in_attesa),
      sub: 'da incassare',
      icon: Clock,
      colorFrom: 'from-blue-100 dark:from-blue-900/30',
      colorTo: 'to-sky-50 dark:to-sky-900/20',
      iconClass: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Scadute',
      value: formatCurrency(stats.scadute_importo),
      sub: 'in ritardo',
      icon: AlertCircle,
      colorFrom: 'from-red-100 dark:from-red-900/30',
      colorTo: 'to-rose-50 dark:to-rose-900/20',
      iconClass: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Media incasso',
      value: stats.media_incasso_giorni != null ? `${stats.media_incasso_giorni} gg` : '—',
      sub: 'giorni da emissione',
      icon: Timer,
      colorFrom: 'from-purple-100 dark:from-purple-900/30',
      colorTo: 'to-violet-50 dark:to-violet-900/20',
      iconClass: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Fatture mese',
      value: String(stats.fatture_mese),
      sub: 'emesse questo mese',
      icon: Receipt,
      colorFrom: 'from-slate-100 dark:from-slate-800/40',
      colorTo: 'to-zinc-50 dark:to-zinc-900/20',
      iconClass: 'text-slate-600 dark:text-slate-400',
    },
    {
      label: 'Scadenze 7gg',
      value: String(stats.prossime_scadenze),
      sub: 'entro 7 giorni',
      icon: CalendarClock,
      colorFrom: stats.prossime_scadenze > 0 ? 'from-amber-100 dark:from-amber-900/30' : 'from-slate-100 dark:from-slate-800/40',
      colorTo: stats.prossime_scadenze > 0 ? 'to-yellow-50 dark:to-yellow-900/20' : 'to-zinc-50 dark:to-zinc-900/20',
      iconClass: stats.prossime_scadenze > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className={`animate-in-${idx + 1} rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.colorFrom} ${card.colorTo}`}>
              <Icon className={`h-4 w-4 ${card.iconClass}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground truncate">{card.label}</p>
              <p className="text-lg font-bold text-foreground leading-tight">{card.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
