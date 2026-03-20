'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MatchResult {
  contact_id: string
  contact_name: string
  contact_type: string
  score: number
  reason: string
  computed_at: string
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

interface ListingMatchPanelProps {
  propertyId: string
}

export function ListingMatchPanel({ propertyId }: ListingMatchPanelProps) {
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [status, setStatus] = useState<'ready' | 'pending'>('pending')
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  async function loadMatches() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/banca-dati/match?property_id=${propertyId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setMatches(data.matches ?? [])
      setStatus(data.status ?? 'ready')
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatches()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId])

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[oklch(0.57_0.20_33)]" />
          <span className="text-sm font-semibold">Clienti Compatibili</span>
          {status === 'pending' && !loading && (
            <span className="text-[10px] text-amber-500">(in attesa calcolo)</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground"
          onClick={loadMatches}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
          Aggiorna
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento match…
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {!loading && status === 'pending' && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          I match vengono calcolati automaticamente ogni notte. Saranno disponibili al prossimo aggiornamento.
        </p>
      )}

      {!loading && matches.length === 0 && status === 'ready' && (
        <p className="text-sm text-muted-foreground">Nessun cliente compatibile trovato.</p>
      )}

      {!loading && matches.length > 0 && (
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
              {m.reason && <p className="text-xs text-muted-foreground italic">{m.reason}</p>}
            </div>
          ))}
          {lastRefresh && (
            <p className="text-[10px] text-muted-foreground text-right">
              Aggiornato: {lastRefresh.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
