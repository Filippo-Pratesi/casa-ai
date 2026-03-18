'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Phone, Mail, Eye, MessageSquare, FileText, Home, CheckCircle,
  AlertCircle, RefreshCw, Star, StickyNote, Users, Building2,
  Megaphone, TrendingUp, Package, MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  created_at: string
  metadata?: Record<string, unknown>
}

const EVENT_ICON: Record<string, React.ElementType> = {
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

const EVENT_LABELS: Record<string, string> = {
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
  ritorno: 'Ritorno disponibile',
  valutazione_ai: 'Valutazione AI',
  insight_ai: 'Insight AI',
  altro: 'Altro',
}

const SENTIMENT_CONFIG = {
  positive: { label: 'Positivo', color: 'text-green-500', dot: 'bg-green-400' },
  neutral: { label: 'Neutro', color: 'text-gray-400', dot: 'bg-gray-400' },
  negative: { label: 'Negativo', color: 'text-red-500', dot: 'bg-red-400' },
}

const QUICK_EVENT_TYPES = [
  { type: 'nota', label: 'Nota', icon: StickyNote },
  { type: 'telefonata', label: 'Telefonata', icon: Phone },
  { type: 'visita', label: 'Visita', icon: Eye },
  { type: 'citofono', label: 'Citofono', icon: Home },
] as const

interface EventTimelineProps {
  propertyId: string
  events: PropertyEvent[]
  onEventAdded?: () => void
}

export function EventTimeline({ propertyId, events, onEventAdded }: EventTimelineProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [defaultType, setDefaultType] = useState<string>('nota')
  const [submitting, setSubmitting] = useState(false)

  const [formType, setFormType] = useState('nota')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSentiment, setFormSentiment] = useState<string>('')

  function openDialog(type: string) {
    setDefaultType(type)
    setFormType(type)
    setFormTitle('')
    setFormDescription('')
    setFormSentiment('')
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formTitle.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: formType,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          sentiment: formSentiment || null,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      toast.success('Evento aggiunto')
      setDialogOpen(false)
      onEventAdded?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_EVENT_TYPES.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => openDialog(type)}
            className="gap-1.5 text-xs h-8"
          >
            <Icon className="h-3.5 w-3.5" />
            + {label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-0">
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nessun evento ancora. Aggiungi una nota per iniziare.
          </p>
        )}

        {events.map((event, idx) => {
          const Icon = EVENT_ICON[event.event_type] ?? MoreHorizontal
          const isLast = idx === events.length - 1

          return (
            <div key={event.id} className="flex gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-background',
                  'bg-muted ring-1 ring-border/40'
                )}>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/50 mt-1 mb-1 min-h-[16px]" />}
              </div>

              {/* Content */}
              <div className={cn('pb-4 pt-1 min-w-0 flex-1', isLast && 'pb-0')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {EVENT_LABELS[event.event_type] ?? event.event_type}
                      </span>
                      {event.sentiment && (
                        <span className={cn('flex items-center gap-1 text-xs', SENTIMENT_CONFIG[event.sentiment]?.color)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', SENTIMENT_CONFIG[event.sentiment]?.dot)} />
                          {SENTIMENT_CONFIG[event.sentiment]?.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-0.5">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">
                    {event.agent_name ?? 'Agente'}
                  </span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <time
                    className="text-xs text-muted-foreground"
                    title={format(new Date(event.created_at), 'dd/MM/yyyy HH:mm')}
                  >
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: it })}
                  </time>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add event dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tipo evento</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v ?? '')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_LABELS)
                    .filter(([key]) => ['nota', 'telefonata', 'visita', 'citofono', 'email_inviata', 'whatsapp_inviato', 'riunione', 'documento_caricato', 'altro'].includes(key))
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Titolo *</Label>
              <Input
                placeholder="Es. Chiamata al proprietario, Visita immobile..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Note (opzionale)</Label>
              <Textarea
                placeholder="Dettagli dell'evento..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Sentiment (opzionale)</Label>
              <Select value={formSentiment} onValueChange={(v) => setFormSentiment(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">😊 Positivo</SelectItem>
                  <SelectItem value="neutral">😐 Neutro</SelectItem>
                  <SelectItem value="negative">😞 Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Salvataggio...' : 'Aggiungi evento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
