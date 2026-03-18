import { TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { formatCurrency } from './invoice-totals-calculator'

interface SummaryCardProps {
  fatturato: number
  inAttesa: number
  scadute: number
}

export function InvoiceSummaryCards({ fatturato, inAttesa, scadute }: SummaryCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="animate-in-1 rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20">
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Fatturato</p>
          <p className="text-lg font-bold text-foreground leading-tight">{formatCurrency(fatturato)}</p>
        </div>
      </div>
      <div className="animate-in-2 rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">In attesa</p>
          <p className="text-lg font-bold text-foreground leading-tight">{formatCurrency(inAttesa)}</p>
        </div>
      </div>
      <div className="animate-in-3 rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Scadute</p>
          <p className="text-lg font-bold text-foreground leading-tight">{formatCurrency(scadute)}</p>
        </div>
      </div>
    </div>
  )
}
