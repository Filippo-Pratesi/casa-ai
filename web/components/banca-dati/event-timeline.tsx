'use client'

import { useState } from 'react'
import { formatDistanceToNow, format, formatDistance } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Phone, Mail, Eye, MessageSquare, FileText, Home, CheckCircle,
  AlertCircle, RefreshCw, Star, StickyNote, Users, Building2,
  Megaphone, TrendingUp, Package, MoreHorizontal, Plus, X, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export interface PropertyEvent {
  id: string
  event_type: string
  title: string
  description: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  contact_id: string | null
  agent_id: string
  agent_name?: string | null
  event_date: string
  created_at: string
  metadata?: Record<string, unknown>
}

export const EVENT_ICON: Record<string, React.ElementType> = {
  nota: StickyNote,
  telefonata: Phone,
  visita: Eye,
  citofono: Home,
  email_inviata: Mail,
  whatsapp_inviato: MessageSquare,
  riunione: Users,
  documento_caricato: FileText,
  incarico_firmato: Star,
  proposta_ricevuta: TrendingUp,
  proposta_accettata: CheckCircle,
  proposta_rifiutata: AlertCircle,
  proprietario_identificato: Users,
  proprietario_cambiato: RefreshCw,
  cambio_stage: RefreshCw,
  annuncio_creato: Megaphone,
  annuncio_pubblicato: Megaphone,
  venduto: Building2,
  locato: Home,
  contratto_scaduto: AlertCircle,
  archiviato: Package,
  ritorno: RefreshCw,
  valutazione_ai: Star,
  insight_ai: Star,
  altro: MoreHorizontal,
}

export const EVENT_LABELS: Record<string, string> = {
  nota: 'Nota',
  telefonata: 'Telefonata',
  visita: 'Visita',
  citofono: 'Citofono',
  email_inviata: 'Email inviata',
  whatsapp_inviato: 'WhatsApp inviato',
  riunione: 'Riunione',
  documento_caricato: 'Documento caricato',
  incarico_firmato: 'Incarico firmato',
  proposta_ricevuta: 'Proposta ricevuta',
  proposta_accettata: 'Proposta accettata',
  proposta_rifiutata: 'Proposta rifiutata',
  proprietario_identificato: 'Proprietario identificato',
  proprietario_cambiato: 'Proprietario cambiato',
  cambio_stage: 'Cambio stage',
  annuncio_creato: 'Annuncio creato',
  annuncio_pubblicato: 'Annuncio pubblicato',
  venduto: 'Venduto',
  locato: 'Locato',
  contratto_scaduto: 'Contratto scaduto',
  archiviato: 'Archiviato',
  ritorno: 'Ritorno al mercato',
  valutazione_ai: 'Valutazione AI',
  insight_ai: 'Insight AI',
  altro: 'Altro',
}

const SENTIMENT_CONFIG = {
  positive: { label: 'Positivo', color: 'text-green-500', dot: 'bg-green-400' },
  neutral: { label: 'Neutro', color: 'text-gray-400', dot: 'bg-gray-400' },
  negative: { label: 'Negativo', color: 'text-red-500', dot: 'bg-red-400' },
}

const QUICK_NOTE_TYPES = ['nota', 'telefonata', 'visita', 'citofono', 'email_inviata', 'whatsapp_inviato', 'riunione', 'documento_caricato', 'altro'] as const

interface EventTimelineProps {
  propertyId: string
  events: PropertyEvent[]
  onEventAdded?: () => void
}

// Inline quick-note form (no modal)
function QuickNoteForm({ propertyId, onSaved, onCancel }: { propertyId: string; onSaved: () => void; onCancel: () => void }) {
  const [type, setType] = useState('nota')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: type,
          title: title.trim(),
          description: description.trim() || null,
          sentiment: sentiment || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast.success('Evento aggiunto')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={type} onValueChange={(v) => setType(v ?? 'nota')}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUICK_NOTE_TYPES.map(t => (
              <SelectItem key={t} value={t} className="text-xs">{EVENT_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentiment} onValueChange={(v) => setSentiment(v ?? '')}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="positive" className="text-xs">😊 Positivo</SelectItem>
            <SelectItem value="neutral" className="text-xs">😐 Neutro</SelectItem>
            <SelectItem value="negative" className="text-xs">😞 Negativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
        placeholder="Titolo evento (premi Invio per salvare)..."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Note aggiuntive (opzionale)..."
        rows={2}
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
      />
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting} className="h-8 text-xs">
          <X className="h-3.5 w-3.5 mr-1" />
          Annulla
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={submitting} className="h-8 text-xs">
          {submitting ? 'Salvataggio...' : 'Aggiungi'}
        </Button>
      </div>
    </div>
  )
}

// Duration label between two events
function DurationBadge({ from, to }: { from: string; to: string }) {
  const diff = Math.abs(new Date(to).getTime() - new Date(from).getTime())
  if (diff < 60_000) return null  // less than 1 minute — skip
  const label = formatDistance(new Date(from), new Date(to), { locale: it })
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 pl-8 py-0">
      <Clock className="h-2.5 w-2.5" />
      <span>{label} dopo</span>
    </div>
  )
}

export function EventTimeline({ propertyId, events, onEventAdded }: EventTimelineProps) {
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('all')

  // Gather unique event types present in the list for the filter
  const presentTypes = Array.from(new Set(events.map(e => e.event_type))).sort()

  const filtered = filterType === 'all' ? events : events.filter(e => e.event_type === filterType)

  function handleSaved() {
    setShowForm(false)
    onEventAdded?.()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: add button + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Aggiungi nota rapida
          </Button>
        )}
        {presentTypes.length > 1 && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Filtra:</span>
            <Select value={filterType} onValueChange={(v) => setFilterType(v ?? 'all')}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <span className="truncate text-xs">
                  {filterType === 'all' ? `Tutti (${events.length})` : `${EVENT_LABELS[filterType] ?? filterType} (${events.filter(e => e.event_type === filterType).length})`}
                </span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all" className="text-xs">Tutti ({events.length})</SelectItem>
                {presentTypes.map(t => {
                  const count = events.filter(e => e.event_type === t).length
                  return (
                    <SelectItem key={t} value={t} className="text-xs">
                      {EVENT_LABELS[t] ?? t} ({count})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Inline quick-note form */}
      {showForm && (
        <QuickNoteForm
          propertyId={propertyId}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Timeline */}
      <div className="relative space-y-0">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {filterType !== 'all' ? 'Nessun evento di questo tipo.' : 'Nessun evento ancora. Aggiungi una nota per iniziare.'}
          </p>
        )}

        {filtered.map((event, idx) => {
          const Icon = EVENT_ICON[event.event_type] ?? MoreHorizontal
          const isLast = idx === filtered.length - 1
          const nextEvent = filtered[idx + 1]

          return (
            <div key={event.id}>
              <div className="flex gap-2">
                {/* Vertical line + dot */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background',
                    'bg-muted ring-1 ring-border/40'
                  )}>
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-border/50 mt-0.5 mb-0.5 min-h-[12px]" />}
                </div>

                {/* Content */}
                <div className={cn('pb-2.5 pt-0.5 min-w-0 flex-1', isLast && 'pb-0')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {EVENT_LABELS[event.event_type] ?? event.event_type}
                        </span>
                        {event.sentiment && (
                          <span className={cn('flex items-center gap-1 text-[10px]', SENTIMENT_CONFIG[event.sentiment]?.color)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', SENTIMENT_CONFIG[event.sentiment]?.dot)} />
                            {SENTIMENT_CONFIG[event.sentiment]?.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-0.5 leading-snug">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{event.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {event.agent_name ?? 'Agente'}
                    </span>
                    <span className="text-muted-foreground/40 text-[10px]">·</span>
                    <time
                      className="text-[10px] text-muted-foreground"
                      title={format(new Date(event.event_date ?? event.created_at), 'dd/MM/yyyy HH:mm')}
                    >
                      {formatDistanceToNow(new Date(event.event_date ?? event.created_at), { addSuffix: true, locale: it })}
                    </time>
                  </div>
                </div>
              </div>

              {/* Duration between this event and the next (only show if > 1 day) */}
              {!isLast && nextEvent && Math.abs(new Date(nextEvent.event_date ?? nextEvent.created_at).getTime() - new Date(event.event_date ?? event.created_at).getTime()) > 86_400_000 && (
                <DurationBadge
                  from={event.event_date ?? event.created_at}
                  to={nextEvent.event_date ?? nextEvent.created_at}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
