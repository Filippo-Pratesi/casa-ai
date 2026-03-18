'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const TONES = [
  { id: 'standard', label: 'Standard', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { id: 'luxury', label: 'Luxury', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { id: 'approachable', label: 'Accessibile', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
  { id: 'investment', label: 'Investimento', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
] as const

type Tone = typeof TONES[number]['id']

interface ToneRegenerateProps {
  listingId: string
  currentTone: string
}

export function ToneRegenerate({ listingId, currentTone }: ToneRegenerateProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Tone>(currentTone as Tone)
  const [loading, setLoading] = useState(false)

  async function handleRegenerate() {
    if (loading) return
    setLoading(true)
    try {
      // 1. Update tone on listing
      const patchRes = await fetch(`/api/listing/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: selected }),
      })
      if (!patchRes.ok) {
        toast.error('Errore nel cambio stile')
        return
      }
      // 2. Regenerate all content with new tone
      const genRes = await fetch(`/api/listing/${listingId}/generate`, { method: 'POST' })
      if (!genRes.ok) {
        toast.error('Errore nella rigenerazione')
        return
      }
      toast.success('Contenuto rigenerato con stile ' + TONES.find(t => t.id === selected)?.label)
      router.refresh()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const changed = selected !== currentTone

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Stile di comunicazione</p>
      <div className="flex flex-wrap gap-2">
        {TONES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
              selected === t.id
                ? t.color + ' ring-2 ring-offset-1 ring-current'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {t.label}
            {t.id === currentTone && selected !== currentTone && (
              <span className="ml-1 opacity-50">(attuale)</span>
            )}
          </button>
        ))}
      </div>
      {changed && (
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="btn-ai inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Rigenerazione in corso…' : `Rigenera con stile ${TONES.find(t => t.id === selected)?.label}`}
        </button>
      )}
    </div>
  )
}
