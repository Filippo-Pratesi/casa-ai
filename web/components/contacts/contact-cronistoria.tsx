'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { FileText, Phone, Mail, Calendar, Megaphone, Home, Plus, Loader2, ChevronDown, RefreshCw, Star, CheckCircle, ThumbsDown, ThumbsUp, Send, Undo2, ArrowLeftRight, KeyRound, AlertCircle, Clock, UserPlus, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { EVENT_COLORS, EVENT_LABELS, EVENT_ICON_NAMES } from '@/lib/contact-event-types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

// Map icon names to lucide components
const ICON_COMPONENTS: Record<string, React.ElementType> = {
  FileText,
  Phone,
  Mail,
  Calendar,
  Megaphone,
  Home,
  RefreshCw,
  Star,
  CheckCircle2: CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Undo2,
  ArrowLeftRight,
  KeyRound,
  AlertCircle,
  Clock,
  UserPlus,
  PenLine,
}

export function ContactCronistoria({ contactId, initialEvents }: ContactCronistoriaProps) {
  const [events, setEvents] = useState<ContactEvent[]>(initialEvents)
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const presentTypes = useMemo(
    () => Array.from(new Set(events.map(e => e.event_type))).sort(),
    [events]
  )

  const filteredEvents = filterType === 'all' ? events : events.filter(e => e.event_type === filterType)
  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 10)

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
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex-1">
            Cronistoria
          </p>
          {presentTypes.length > 1 && (
            <Select value={filterType} onValueChange={(v) => { setFilterType(v ?? 'all'); setShowAll(false) }}>
              <SelectTrigger className="h-7 w-[150px] text-xs">
                <span className="truncate text-xs">
                  {filterType === 'all'
                    ? `Tutti (${events.length})`
                    : `${EVENT_LABELS[filterType as keyof typeof EVENT_LABELS] ?? filterType} (${events.filter(e => e.event_type === filterType).length})`}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all" className="text-xs">Tutti ({events.length})</SelectItem>
                {presentTypes.map(t => {
                  const count = events.filter(e => e.event_type === t).length
                  return (
                    <SelectItem key={t} value={t} className="text-xs">
                      {EVENT_LABELS[t as keyof typeof EVENT_LABELS] ?? t} ({count})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
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

        {filteredEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {filterType !== 'all' ? 'Nessun evento di questo tipo.' : 'Nessun evento registrato'}
          </p>
        ) : (
          <ul role="list" className="border-l-2 border-border pl-4 space-y-3 max-h-[70vh] overflow-y-auto overscroll-contain pr-1">
            {displayedEvents.map((ev) => {
              const iconName = EVENT_ICON_NAMES[ev.event_type as keyof typeof EVENT_ICON_NAMES] ?? 'FileText'
              const Icon = ICON_COMPONENTS[iconName] ?? FileText
              const colorClass = EVENT_COLORS[ev.event_type as keyof typeof EVENT_COLORS] ?? EVENT_COLORS.nota
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
                          {EVENT_LABELS[ev.event_type as keyof typeof EVENT_LABELS] ?? ev.event_type}
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

        {filteredEvents.length > 10 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Mostra tutti ({filteredEvents.length} eventi)
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
