'use client'

import Link from 'next/link'

const FILTERS = [
  { value: undefined, label: 'Tutti' },
  { value: 'vendita', label: 'Vendita' },
  { value: 'affitto', label: 'Affitto' },
]

export function ListingTransactionFilter({ active }: { active?: string }) {
  return (
    <div className="flex items-center gap-2 animate-in-2">
      {FILTERS.map(f => {
        const href = f.value ? `/listing?transaction_type=${f.value}` : '/listing'
        const isActive = active === f.value || (!active && !f.value)
        return (
          <Link
            key={f.label}
            href={href}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
            }`}
          >
            {f.label}
          </Link>
        )
      })}
    </div>
  )
}
