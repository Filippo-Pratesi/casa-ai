'use client'

import { useState } from 'react'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { PropertyEvent } from './event-timeline'
import { EVENT_LABELS } from './event-timeline'

export interface ListingNoteEntry {
  id: string
  content: string
  created_at: string
  agent_name: string | null
}

type FilterType = 'all' | 'events' | 'notes'

interface Props {
  propertyId: string
  events: PropertyEvent[]
  initialListingNotes?: ListingNoteEntry[]
  onEventAdded?: () => void
}

export function PropertyCronistoriaPanel({
  propertyId,
  events,
  initialListingNotes = [],
  onEventAdded,
}: Props) {
  const [noteText, setNoteText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  type TimelineEntry = {
    key: string
    source: 'event' | 'listing_note'
    event_type: string
    title: string
    description: string | null
    event_date: string
    agent_name: string | null
  }

  const eventsAsEntries: TimelineEntry[] = events.map(e => ({
    key: `ev-${e.id}`,
    source: 'event' as const,
    event_type: e.event_type,
    title: e.title,
    description: e.description,
    event_date: e.event_date ?? e.created_at,
    agent_name: e.agent_name ?? null,
  }))

  const notesAsEntries: TimelineEntry[] = initialListingNotes.map(n => ({
    key: `ln-${n.id}`,
    source: 'listing_note' as const,
    event_type: 'nota_annuncio',
    title: n.content,
    description: null,
    event_date: n.created_at,
    agent_name: n.agent_name,
  }))

  const allEntries: TimelineEntry[] = [...eventsAsEntries, ...notesAsEntries].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  const displayed =
    filter === 'events' ? allEntries.filter(e => e.source === 'event') :
    filter === 'notes' ? allEntries.filter(e => e.source === 'listing_note') :
    allEntries

  const hasEvents = events.length > 0
  const hasNotes = initialListingNotes.length > 0
  const showFilterPills = hasEvents && hasNotes

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'nota', title: noteText.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Errore')
      }
      setNoteText('')
      toast.success('Nota aggiunta')
      onEventAdded?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiunta della nota')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Filter pills — only when both events and listing notes exist */}
      {showFilterPills && (
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'events', 'notes'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                filter === f
                  ? 'bg-[oklch(0.57_0.20_33)] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'Tutto' : f === 'events' ? 'Eventi' : 'Note annuncio'}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {displayed.length > 0 && (
        <ul
          role="list"
          className="border-l-2 border-border pl-3 space-y-3 max-h-[50vh] overflow-y-auto pr-1"
        >
          {displayed.map((entry) => (
            <li key={entry.key} className="relative">
              <div
                className={`absolute -left-[17px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                  entry.source === 'listing_note'
                    ? 'bg-blue-500'
                    : 'bg-[oklch(0.57_0.20_33)]'
                }`}
              />
              <div className="space-y-0.5">
                <p className="text-xs font-medium leading-tight">{entry.title}</p>
                {entry.description && (
                  <p className="text-[10px] text-muted-foreground line-clamp-3">
                    {entry.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[9px] font-medium rounded px-1 py-0.5 ${
                      entry.source === 'listing_note'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {entry.source === 'listing_note'
                      ? 'Nota annuncio'
                      : (EVENT_LABELS[entry.event_type] ?? entry.event_type)}
                  </span>
                </div>
                <time className="text-[9px] text-muted-foreground/50 block">
                  {new Date(entry.event_date).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {entry.agent_name ? ` · ${entry.agent_name}` : ''}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}

      {displayed.length === 0 && filter !== 'all' && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nessun elemento in questa categoria
        </p>
      )}

      {displayed.length === 0 && filter === 'all' && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nessun evento ancora.
        </p>
      )}

      {/* Note input */}
      <div className="pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          Aggiungi nota interna
        </p>
        <form onSubmit={handleSubmitNote} className="space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Scrivi una nota interna per il team…"
            rows={2}
            maxLength={2000}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!noteText.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.57_0.20_33)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[oklch(0.50_0.20_33)] transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Salva nota
          </button>
        </form>
      </div>
    </div>
  )
}
