'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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

const CONTACT_TYPES = [
  { value: 'all', label: 'Tutti i contatti' },
  { value: 'buyer', label: 'Solo acquirenti' },
  { value: 'seller', label: 'Solo venditori' },
  { value: 'renter', label: 'Solo affittuari' },
]

interface CampaignEditClientProps {
  campaign: {
    id: string
    subject: string
    body_text: string
    template: string
    recipient_filter: { type: string; city?: string } | null
  }
  cities: string[]
  totalContacts: number
}

export function CampaignEditClient({ campaign, cities, totalContacts }: CampaignEditClientProps) {
  const router = useRouter()

  const initialFilter = campaign.recipient_filter ?? { type: 'all' }

  const [template, setTemplate] = useState(campaign.template || 'custom')
  const [subject, setSubject] = useState(campaign.subject)
  const [body, setBody] = useState(campaign.body_text)
  const [recipientType, setRecipientType] = useState(initialFilter.type || 'all')
  const [cityFilter, setCityFilter] = useState(initialFilter.city ?? '')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

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
          recipient_filter: {
            type: recipientType,
            city: cityFilter || undefined,
          },
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

  return (
    <div className="space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-in-1">
        <Link href="/campaigns" className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Modifica bozza</h1>
          <p className="text-sm text-muted-foreground">{totalContacts} contatti con email disponibili</p>
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destinatari</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tipo cliente</label>
              <select
                value={recipientType}
                onChange={e => setRecipientType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
              >
                {CONTACT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {cities.length > 0 && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Filtro città</label>
                <select
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                >
                  <option value="">Tutte le città</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
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
