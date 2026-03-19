'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ChevronDown, ChevronUp, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MatchResult {
  contact_id: string
  contact_name: string
  contact_type: string
  score: number
  reason: string
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  renter: 'Inquilino',
  seller: 'Venditore',
  landlord: 'Proprietario',
  other: 'Altro',
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-blue-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-7 text-right">{score}</span>
    </div>
  )
}

interface AiMatchPanelProps {
  propertyId: string
}

export function AiMatchPanel({ propertyId }: AiMatchPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchResult[] | null>(null)
  const [cached, setCached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches(force = false) {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/banca-dati/match?property_id=${propertyId}${force ? '&force=1' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setMatches(data.matches ?? [])
      setCached(data.cached ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore AI')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle() {
    const newOpen = !open
    setOpen(newOpen)
    if (newOpen && matches === null) loadMatches()
  }

  return (
    <Card className="p-5">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[oklch(0.57_0.20_33)]" />
          <span className="text-sm font-semibold">AI Match Engine</span>
          {cached && <span className="text-[10px] text-muted-foreground">(cache)</span>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisi in corso…
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive py-2">{error}</div>
          )}

          {!loading && matches !== null && matches.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun cliente compatibile trovato.</p>
          )}

          {!loading && matches !== null && matches.length > 0 && (
            <div className="space-y-2">
              {matches.map(m => (
                <div key={m.contact_id} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {m.contact_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.contact_name}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_LABELS[m.contact_type] ?? m.contact_type}</p>
                      </div>
                    </div>
                    <Link
                      href={`/contacts/${m.contact_id}`}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <ScoreBar score={m.score} />
                  <p className="text-xs text-muted-foreground italic">{m.reason}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && matches !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground"
              onClick={() => { CACHE_BUST_HACK(); loadMatches(true) }}
            >
              <RefreshCw className="h-3 w-3" />
              Ricalcola
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// Clears client-side cache hint by passing force param
function CACHE_BUST_HACK() { /* intentional no-op, force param handled in fetch */ }
