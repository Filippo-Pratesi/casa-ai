'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Phone, Mail, Calendar, Megaphone, Home, Plus, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface ContactEvent {
  id: string
  event_type: string
  title: string
  body: string | null
  event_date: string
  agent_name: string | null
  related_property_id: string | null
  related_listing_id: string | null
}

interface ContactCronistoriaProps {
  contactId: string
  initialEvents: ContactEvent[]
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  nota: FileText,
  chiamata: Phone,
  email: Mail,
  appuntamento: Calendar,
  campagna_inviata: Megaphone,
  immobile_proposto: Home,
}

const EVENT_COLORS: Record<string, string> = {
  nota: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  chiamata: 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400',
  email: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  appuntamento: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  campagna_inviata: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  immobile_proposto: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400',
}

const EVENT_LABELS: Record<string, string> = {
  nota: 'Nota',
  chiamata: 'Chiamata',
  email: 'Email',
  appuntamento: 'Appuntamento',
  campagna_inviata: 'Campagna inviata',
  immobile_proposto: 'Immobile proposto',
}

export function ContactCronistoria({ contactId, initialEvents }: ContactCronistoriaProps) {
  const [events, setEvents] = useState<ContactEvent[]>(initialEvents)
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const displayedEvents = showAll ? events : events.slice(0, 10)

  const handleAddNote = useCallback(async () => {
    const text = noteText.trim()
    if (!text) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'nota', title: text }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error ?? 'Errore salvataggio')
      }
      const { id } = await res.json()
      const newEvent: ContactEvent = {
        id,
        event_type: 'nota',
        title: text,
        body: null,
        event_date: new Date().toISOString(),
        agent_name: null,
        related_property_id: null,
        related_listing_id: null,
      }
      setEvents(prev => [newEvent, ...prev])
      setNoteText('')
      setShowAddNote(false)
      toast.success('Nota aggiunta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSavingNote(false)
    }
  }, [contactId, noteText])

  // Separate "immobile proposto" events for the dedicated section
  const proposedEvents = events.filter(e => e.event_type === 'immobile_proposto')

  return (
    <div className="space-y-4">
      {/* Cronistoria section */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Cronistoria
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowAddNote(v => !v)}
          >
            <Plus className="h-3 w-3" />
            Aggiungi nota
          </Button>
        </div>

        {/* Add note inline form */}
        {showAddNote && (
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <Textarea
              placeholder="Scrivi una nota…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              autoFocus
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowAddNote(false); setNoteText('') }}
              >
                Annulla
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
              >
                {savingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salva nota'}
              </Button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nessun evento registrato</p>
        ) : (
          <ul role="list" className="border-l-2 border-border pl-4 space-y-3">
            {displayedEvents.map((ev) => {
              const Icon = EVENT_ICONS[ev.event_type] ?? FileText
              const colorClass = EVENT_COLORS[ev.event_type] ?? EVENT_COLORS.nota
              return (
                <li key={ev.id} className="relative">
                  <div className={`absolute -left-[21px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-2.5 w-2.5" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{ev.title}</p>
                      {ev.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ev.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${colorClass}`}>
                          {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                        </span>
                        {ev.related_listing_id && (
                          <Link
                            href={`/listing/${ev.related_listing_id}`}
                            className="text-[10px] text-[oklch(0.57_0.20_33)] hover:underline"
                          >
                            Vedi annuncio
                          </Link>
                        )}
                        {ev.related_property_id && (
                          <Link
                            href={`/banca-dati/${ev.related_property_id}`}
                            className="text-[10px] text-[oklch(0.57_0.20_33)] hover:underline"
                          >
                            Vedi immobile
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <time className="text-[10px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(ev.event_date), { addSuffix: true, locale: it })}
                      </time>
                      {ev.agent_name && (
                        <p className="text-[10px] text-muted-foreground/50">{ev.agent_name}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {events.length > 10 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Mostra tutti ({events.length} eventi)
          </button>
        )}
      </div>

      {/* Immobili proposti section */}
      {proposedEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5" />
            Immobili proposti ({proposedEvents.length})
          </p>
          <div className="space-y-2">
            {proposedEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{ev.title}</p>
                  <time className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(ev.event_date), { addSuffix: true, locale: it })}
                  </time>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ev.related_listing_id && (
                    <Link
                      href={`/listing/${ev.related_listing_id}`}
                      className="text-xs text-[oklch(0.57_0.20_33)] hover:underline"
                    >
                      Annuncio
                    </Link>
                  )}
                  {ev.related_property_id && (
                    <Link
                      href={`/banca-dati/${ev.related_property_id}`}
                      className="text-xs text-[oklch(0.57_0.20_33)] hover:underline"
                    >
                      Immobile
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
