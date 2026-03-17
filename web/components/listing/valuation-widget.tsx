import { TrendingUp, BarChart2 } from 'lucide-react'

interface SoldListing {
  price: number
  sqm: number
  address: string
}

interface ValuationWidgetProps {
  currentPrice: number
  currentSqm: number
  comparables: SoldListing[]
}

export function ValuationWidget({ currentPrice, currentSqm, comparables }: ValuationWidgetProps) {
  if (comparables.length === 0) return null

  const avgPrice = Math.round(comparables.reduce((s, l) => s + l.price, 0) / comparables.length)
  const avgPricePerSqm = Math.round(
    comparables.reduce((s, l) => s + (l.sqm > 0 ? l.price / l.sqm : 0), 0) / comparables.length
  )
  const currentPricePerSqm = currentSqm > 0 ? Math.round(currentPrice / currentSqm) : null

  const diff = currentPrice - avgPrice
  const diffPct = Math.round((diff / avgPrice) * 100)
  const isAbove = diff > 0

  // Bar chart: normalize prices to percentages of max
  const allPrices = [...comparables.map((l) => l.price), currentPrice]
  const maxPrice = Math.max(...allPrices)

  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stima di mercato</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-card border border-border px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Prezzo medio zona</p>
          <p className="text-sm font-bold text-foreground">€{avgPrice.toLocaleString('it-IT')}</p>
        </div>
        <div className={`rounded-lg border px-3 py-2.5 text-center ${isAbove ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Differenza</p>
          <p className={`text-sm font-bold ${isAbove ? 'text-red-600' : 'text-green-600'}`}>
            {isAbove ? '+' : ''}{diffPct}%
          </p>
        </div>
        <div className="rounded-lg bg-card border border-border px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">€/m² medio</p>
          <p className="text-sm font-bold text-foreground">
            {currentPricePerSqm ? `€${currentPricePerSqm.toLocaleString('it-IT')}` : '—'}
          </p>
          {avgPricePerSqm > 0 && (
            <p className="text-[10px] text-muted-foreground">zona: €{avgPricePerSqm.toLocaleString('it-IT')}</p>
          )}
        </div>
      </div>

      {/* Comparables bar chart */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">{comparables.length} vendite simili archiviate</p>
        </div>

        {/* Current listing bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 shrink-0 truncate text-[11px] text-muted-foreground">Questo immobile</div>
          <div className="flex-1 rounded-full bg-muted h-2 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[oklch(0.57_0.20_33)]"
              style={{ width: `${(currentPrice / maxPrice) * 100}%` }}
            />
          </div>
          <div className="w-20 shrink-0 text-right text-[11px] font-medium text-foreground">
            €{currentPrice.toLocaleString('it-IT')}
          </div>
        </div>

        {comparables.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-24 shrink-0 truncate text-[11px] text-muted-foreground">{l.address.split(',')[0]}</div>
            <div className="flex-1 rounded-full bg-muted h-2 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-green-400"
                style={{ width: `${(l.price / maxPrice) * 100}%` }}
              />
            </div>
            <div className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
              €{l.price.toLocaleString('it-IT')}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Basato su immobili venduti nella stessa città con ±1 locale. Solo a scopo indicativo.
      </p>
    </div>
  )
}
