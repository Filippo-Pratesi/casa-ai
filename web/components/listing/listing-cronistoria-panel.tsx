'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

export interface CronistoriaEvent {
  id: string
  source: 'property' | 'contact'
  event_type: string
  title: string
  description: string | null
  event_date: string
  agent_name: string | null
  contact_name: string | null
  contact_id: string | null
}

export interface ListingNote {
  id: string
  content: string
  created_at: string
  agent_name: string | null
  sentiment?: string | null
}

type FilterType = 'all' | 'events' | 'notes'
type Sentiment = 'positive' | 'neutral' | 'negative' | ''

const SENTIMENT_CONFIG: Record<string, { emoji: string; label: string; badge: string }> = {
  positive: { emoji: '😊', label: 'Positivo', badge: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' },
  neutral:  { emoji: '😐', label: 'Neutro',   badge: 'bg-muted text-muted-foreground' },
  negative: { emoji: '😞', label: 'Negativo', badge: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' },
}

interface Props {
  listingId: string
  initialEvents: CronistoriaEvent[]
  initialNotes: ListingNote[]
}

export function ListingCronistoriaPanel({ listingId, initialEvents, initialNotes }: Props) {
  const [notes, setNotes] = useState<ListingNote[]>(initialNotes)
  const [noteText, setNoteText] = useState('')
  const [sentiment, setSentiment] = useState<Sentiment>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  // Merge events + notes into a unified timeline entry type
  type TimelineEntry = {
    key: string
    source: 'property' | 'contact' | 'note'
    event_type: string
    title: string
    description: string | null
    event_date: string
    agent_name: string | null
    contact_name: string | null
    contact_id: string | null
    sentiment?: string | null
  }

  const notesAsEntries: TimelineEntry[] = notes.map((n) => ({
    key: `note-${n.id}`,
    source: 'note' as const,
    event_type: 'nota_agente',
    title: 'Nota Agente',
    description: n.content,
    event_date: n.created_at,
    agent_name: n.agent_name,
    contact_name: null,
    contact_id: null,
    sentiment: n.sentiment ?? null,
  }))

  const eventsAsEntries: TimelineEntry[] = initialEvents.map((e) => ({
    key: `${e.source}-${e.id}`,
    source: e.source,
    event_type: e.event_type,
    title: e.title,
    description: e.description,
    event_date: e.event_date,
    agent_name: e.agent_name,
    contact_name: e.contact_name,
    contact_id: e.contact_id,
    sentiment: null,
  }))

  const allEntries: TimelineEntry[] = [...eventsAsEntries, ...notesAsEntries].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )

  const displayed =
    filter === 'events'
      ? allEntries.filter((e) => e.source !== 'note')
      : filter === 'notes'
      ? allEntries.filter((e) => e.source === 'note')
      : allEntries

  const hasEvents = initialEvents.length > 0
  const hasNotes = notes.length > 0
  const showFilterPills = hasEvents && hasNotes

  async function handleSubmitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteText.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/listing/${listingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim(), sentiment: sentiment || null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Errore')
      }
      const data = (await res.json()) as ListingNote
      setNotes((prev) => [data, ...prev])
      setNoteText('')
      setSentiment('')
      toast.success('Nota aggiunta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'aggiunta della nota')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="hidden lg:block lg:sticky lg:top-4 space-y-3">
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Cronistoria
        </p>

        {/* Filter pills — only when both events and notes exist */}
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
                {f === 'all' ? 'Tutto' : f === 'events' ? 'Eventi' : 'Note'}
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        {displayed.length > 0 && (
          <ul
            role="list"
            className="border-l-2 border-border pl-3 space-y-3 max-h-[55vh] overflow-y-auto pr-1"
          >
            {displayed.map((entry) => {
              const sentimentCfg = entry.sentiment ? SENTIMENT_CONFIG[entry.sentiment] : null
              return (
                <li key={entry.key} className="relative">
                  <div
                    className={`absolute -left-[17px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                      entry.source === 'note'
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
                          entry.source === 'note'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {entry.source === 'note' ? 'Nota Agente' : entry.event_type}
                      </span>
                      {sentimentCfg && (
                        <span className={`text-[9px] font-medium rounded px-1 py-0.5 ${sentimentCfg.badge}`}>
                          {sentimentCfg.emoji} {sentimentCfg.label}
                        </span>
                      )}
                      {entry.source === 'contact' && entry.contact_name && (
                        <Link
                          href={`/contacts/${entry.contact_id}`}
                          className="text-[9px] text-[oklch(0.57_0.20_33)] hover:underline"
                        >
                          {entry.contact_name}
                        </Link>
                      )}
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
              )
            })}
          </ul>
        )}

        {displayed.length === 0 && filter !== 'all' && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nessun elemento in questa categoria
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
            {/* Sentiment selector */}
            <div className="flex items-center gap-1.5">
              {(['positive', 'neutral', 'negative'] as const).map((s) => {
                const cfg = SENTIMENT_CONFIG[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSentiment(prev => prev === s ? '' : s)}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all ${
                      sentiment === s
                        ? sentimentActiveClass(s)
                        : 'border-border text-muted-foreground opacity-60 hover:opacity-90'
                    }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                )
              })}
            </div>
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
    </div>
  )
}

function sentimentActiveClass(s: string) {
  if (s === 'positive') return 'border-green-400 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400'
  if (s === 'negative') return 'border-red-400 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-400'
  return 'border-gray-400 text-gray-600 bg-muted'
}
