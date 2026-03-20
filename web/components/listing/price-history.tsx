'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface PriceEntry {
  id: string
  old_price: number
  new_price: number
  changed_at: string
}

interface PriceHistoryProps {
  listingId: string
  currentPrice: number
  history: PriceEntry[]
}

export function PriceHistory({ listingId, currentPrice, history }: PriceHistoryProps) {
  const [editing, setEditing] = useState(false)
  const [newPrice, setNewPrice] = useState(String(currentPrice))
  const [price, setPrice] = useState(currentPrice)
  const [entries, setEntries] = useState(history)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const parsed = parseInt(newPrice.replace(/\D/g, ''), 10)
    if (!parsed || parsed <= 0) { toast.error('Prezzo non valido'); return }
    if (parsed === price) { setEditing(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parsed }),
      })
      if (!res.ok) { toast.error('Errore aggiornamento'); return }
      setEntries(prev => [{ id: Date.now().toString(), old_price: price, new_price: parsed, changed_at: new Date().toISOString() }, ...prev])
      setPrice(parsed)
      setNewPrice(String(parsed))
      setEditing(false)
      toast.success('Prezzo aggiornato')
    } catch { toast.error('Errore di rete') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      {/* Current price with edit */}
      <div className="flex items-center justify-between">
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">€</span>
            <input
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              className="w-36 rounded-lg border border-border px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-border"
              autoFocus
            />
            <button onClick={handleSave} disabled={loading} className="rounded-lg p-1.5 bg-[oklch(0.57_0.20_33)] text-white hover:bg-[oklch(0.52_0.20_33)] transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Prezzo corrente:</span>
            <span className="text-sm font-bold text-foreground">€{price.toLocaleString('it-IT')}</span>
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-1 hover:bg-muted transition-colors"
              title="Modifica prezzo"
            >
              <Edit2 className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* History */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((e) => {
            const isDown = e.new_price < e.old_price
            const Icon = isDown ? TrendingDown : TrendingUp
            const pctChange = Math.abs(Math.round(((e.new_price - e.old_price) / e.old_price) * 100))
            return (
              <div key={e.id} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${isDown ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isDown ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`} />
                <span className={`font-medium ${isDown ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                  €{e.old_price.toLocaleString('it-IT')} → €{e.new_price.toLocaleString('it-IT')}
                  <span className="ml-1 font-normal opacity-70">({isDown ? '-' : '+'}{pctChange}%)</span>
                </span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(e.changed_at).toLocaleDateString('it-IT')}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-muted-foreground">Nessuna variazione di prezzo registrata</p>
      )}
    </div>
  )
}
