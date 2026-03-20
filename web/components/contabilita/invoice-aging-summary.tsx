'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from './invoice-totals-calculator'
import type { InvoiceStats, AgingInvoice } from '@/app/api/invoices/stats/route'

interface Props {
  aging: InvoiceStats['aging']
}

interface Bucket {
  label: string
  total: number
  invoices: AgingInvoice[]
  colorBar: string
  colorText: string
  colorBg: string
}

export function InvoiceAgingSummary({ aging }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [openBucket, setOpenBucket] = useState<string | null>(null)

  const totalOpen = aging.bucket_0_30 + aging.bucket_31_60 + aging.bucket_61_90 + aging.bucket_91_plus
  if (totalOpen === 0) return null

  const buckets: Bucket[] = [
    {
      label: '0–30 gg',
      total: aging.bucket_0_30,
      invoices: aging.invoices.filter(i => i.days_overdue <= 30),
      colorBar: 'bg-blue-400',
      colorText: 'text-blue-700 dark:text-blue-300',
      colorBg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    },
    {
      label: '31–60 gg',
      total: aging.bucket_31_60,
      invoices: aging.invoices.filter(i => i.days_overdue > 30 && i.days_overdue <= 60),
      colorBar: 'bg-amber-400',
      colorText: 'text-amber-700 dark:text-amber-300',
      colorBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    },
    {
      label: '61–90 gg',
      total: aging.bucket_61_90,
      invoices: aging.invoices.filter(i => i.days_overdue > 60 && i.days_overdue <= 90),
      colorBar: 'bg-orange-500',
      colorText: 'text-orange-700 dark:text-orange-300',
      colorBg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    },
    {
      label: '90+ gg',
      total: aging.bucket_91_plus,
      invoices: aging.invoices.filter(i => i.days_overdue > 90),
      colorBar: 'bg-red-500',
      colorText: 'text-red-700 dark:text-red-300',
      colorBg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    },
  ].filter(b => b.total > 0)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">Scadenziario crediti</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {formatCurrency(totalOpen)} aperti
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Mini bar chart — always visible */}
      <div className="px-5 pb-3.5 flex gap-1 h-2">
        {buckets.map(b => (
          <div
            key={b.label}
            className={`${b.colorBar} rounded-full transition-all`}
            style={{ width: `${(b.total / totalOpen) * 100}%` }}
            title={`${b.label}: ${formatCurrency(b.total)}`}
          />
        ))}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          {buckets.map(b => (
            <div key={b.label} className={`rounded-xl border px-4 py-3 ${b.colorBg}`}>
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setOpenBucket(openBucket === b.label ? null : b.label)}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${b.colorText}`}>{b.label}</span>
                  <span className="text-xs text-muted-foreground">{b.invoices.length} fatture</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${b.colorText}`}>{formatCurrency(b.total)}</span>
                  {openBucket === b.label
                    ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </div>
              </button>

              {openBucket === b.label && b.invoices.length > 0 && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-current/10">
                  {b.invoices.map(inv => (
                    <Link key={inv.id} href={`/contabilita/${inv.id}`} className="flex items-center justify-between text-xs hover:bg-black/5 dark:hover:bg-white/5 rounded-md px-1 py-0.5 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium text-foreground shrink-0">{inv.numero_fattura}</span>
                        <span className="truncate text-muted-foreground">{inv.cliente_nome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-muted-foreground">{inv.days_overdue} gg</span>
                        <span className="font-semibold text-foreground">{formatCurrency(inv.totale_documento)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
