'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FileText, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { RecipientSelector } from './recipient-selector'

const TEMPLATES = [
  {
    id: 'nuovo_annuncio',
    label: 'Nuovo annuncio',
    subject: '🏠 Nuovo immobile disponibile',
    body: `Gentile cliente,\n\nAbbiamo il piacere di presentarti un nuovo immobile che potrebbe interessarti.\n\n[Inserisci qui i dettagli dell'immobile]\n\nNon esitare a contattarci per una visita.\n\nCordiali saluti,\n[Nome agente]`,
  },
  {
    id: 'calo_prezzo',
    label: 'Calo di prezzo',
    subject: '📉 Riduzione di prezzo — opportunità da non perdere',
    body: `Gentile cliente,\n\nAbbiamo abbassato il prezzo di uno degli immobili che potrebbe interessarti.\n\n[Inserisci qui i dettagli dell'immobile e il nuovo prezzo]\n\nContattaci subito per approfittare di questa opportunità.\n\nCordiali saluti,\n[Nome agente]`,
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    subject: 'Come possiamo aiutarti nella tua ricerca?',
    body: `Gentile cliente,\n\nVolevamo aggiornarti sulla tua ricerca immobiliare.\n\nSiamo a tua disposizione per qualsiasi domanda o per organizzare nuove visite.\n\nCordiali saluti,\n[Nome agente]`,
  },
  {
    id: 'aggiornamento_mercato',
    label: 'Aggiornamento mercato',
    subject: '📊 Aggiornamento mercato immobiliare',
    body: `Gentile cliente,\n\nEcco un aggiornamento sul mercato immobiliare nella tua area di interesse.\n\n[Inserisci qui i dati di mercato]\n\nSiamo a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\n[Nome agente]`,
  },
  {
    id: 'custom',
    label: 'Personalizzata',
    subject: '',
    body: '',
  },
]

interface CampaignEditClientProps {
  campaign: {
    id: string
    subject: string
    body_text: string
    template: string
    recipient_filter: { type?: string; city?: string; mode?: string; contact_ids?: string[] } | null
  }
  cities: string[]
}

function getInitialSelectedIds(
  filter: CampaignEditClientProps['campaign']['recipient_filter']
): Set<string> {
  if (filter?.mode === 'explicit' && Array.isArray(filter.contact_ids)) {
    return new Set<string>(filter.contact_ids)
  }
  return new Set<string>()
}

export function CampaignEditClient({ campaign, cities }: CampaignEditClientProps) {
  const router = useRouter()

  const [template, setTemplate] = useState(campaign.template || 'custom')
  const [subject, setSubject] = useState(campaign.subject)
  const [body, setBody] = useState(campaign.body_text)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    () => getInitialSelectedIds(campaign.recipient_filter)
  )
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedContactIds(ids)
  }, [])

  function applyTemplate(id: string) {
    setTemplate(id)
    const t = TEMPLATES.find(t => t.id === id)
    if (t) {
      if (t.subject) setSubject(t.subject)
      if (t.body) setBody(t.body)
    }
  }

  async function handleUpdate(sendNow: boolean) {
    if (!subject.trim() || !body.trim()) {
      toast.error('Compila oggetto e corpo della mail')
      return
    }
    if (sendNow && selectedContactIds.size === 0) {
      toast.error('Seleziona almeno un destinatario')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body_html: body.replace(/\n/g, '<br/>'),
          body_text: body,
          template,
          contact_ids: Array.from(selectedContactIds),
          send: sendNow,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore nel salvataggio')
        return
      }

      if (sendNow) {
        toast.success(`Campagna inviata a ${data.sent} contatti`)
      } else {
        toast.success('Bozza aggiornata')
      }
      router.refresh()
      router.push('/campaigns')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Errore nell'eliminazione")
        return
      }
      toast.success('Bozza eliminata')
      router.push('/campaigns')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  const selectedCount = selectedContactIds.size

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-in-1">
        <Link href="/campaigns" className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Modifica bozza</h1>
          <p className="text-sm text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} ${selectedCount === 1 ? 'destinatario selezionato' : 'destinatari selezionati'}`
              : 'Seleziona destinatari con email'}
          </p>
        </div>
      </div>

      <div className="animate-in-2 space-y-6">
        {/* Template picker */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Template</label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  template === t.id
                    ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Oggetto *</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Oggetto della email…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Testo *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
            placeholder="Scrivi qui il corpo della mail…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)] resize-none font-mono"
          />
        </div>

        {/* Recipients */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Destinatari
            </p>
          </div>
          <RecipientSelector
            cities={cities}
            listingId={null}
            channel="email"
            selectedIds={selectedContactIds}
            onSelectionChange={handleSelectionChange}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleUpdate(true)}
            disabled={loading}
            className="btn-ai flex-1 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {loading ? 'Invio in corso…' : 'Invia ora'}
          </button>
          <button
            onClick={() => handleUpdate(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            <FileText className="h-4 w-4" />
            Aggiorna bozza
          </button>
        </div>

        {/* Danger zone — delete */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20 p-4">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">
            Zona pericolosa
          </p>
          {deleteConfirm ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">
                Sei sicuro? Questa azione è irreversibile.
              </p>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Conferma eliminazione
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={loading}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/40 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Elimina bozza
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
