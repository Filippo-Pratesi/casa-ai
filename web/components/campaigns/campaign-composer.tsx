'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FileText, Paperclip, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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

interface CampaignComposerProps {
  cities: string[]
  totalContacts: number
}

export function CampaignComposer({ cities, totalContacts }: CampaignComposerProps) {
  const router = useRouter()
  const [template, setTemplate] = useState('custom')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientType, setRecipientType] = useState('all')
  const [cityFilter, setCityFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setAttachmentFile(f)
  }

  function removeAttachment() {
    setAttachmentFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function applyTemplate(id: string) {
    setTemplate(id)
    const t = TEMPLATES.find(t => t.id === id)
    if (t) {
      if (t.subject) setSubject(t.subject)
      if (t.body) setBody(t.body)
    }
  }

  async function handleSend(sendNow: boolean) {
    if (!subject.trim() || !body.trim()) {
      toast.error('Compila oggetto e corpo della mail')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
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
        toast.error(data.error ?? 'Errore')
        return
      }

      // Upload attachment if present
      if (attachmentFile && data.id) {
        const fd = new FormData()
        fd.append('file', attachmentFile)
        await fetch(`/api/campaigns/${data.id}/attachment`, { method: 'POST', body: fd })
      }

      if (sendNow) {
        toast.success(`Campagna inviata a ${data.sent} contatti`)
      } else {
        toast.success('Bozza salvata')
      }
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
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="rounded-lg p-1.5 hover:bg-neutral-100 transition-colors">
          <ArrowLeft className="h-4 w-4 text-neutral-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuova campagna</h1>
          <p className="text-sm text-neutral-500">{totalContacts} contatti con email disponibili</p>
        </div>
      </div>

      {/* Template picker */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-2">Template</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                template === t.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Oggetto *</label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Oggetto della email…"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Testo *</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={10}
          placeholder="Scrivi qui il corpo della mail…"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 resize-none font-mono"
        />
      </div>

      {/* Attachment */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Allegato (opzionale)</label>
        {attachmentFile ? (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <Paperclip className="h-4 w-4 text-neutral-400 shrink-0" />
            <span className="text-sm text-neutral-700 truncate flex-1">{attachmentFile.name}</span>
            <button onClick={removeAttachment} className="rounded p-0.5 hover:bg-neutral-200 transition-colors">
              <X className="h-3.5 w-3.5 text-neutral-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
            Aggiungi allegato
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
      </div>

      {/* Recipients */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <p className="text-xs font-medium text-neutral-600 uppercase tracking-wide">Destinatari</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Tipo cliente</label>
            <select
              value={recipientType}
              onChange={e => setRecipientType(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {CONTACT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {cities.length > 0 && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Filtro città</label>
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-300"
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
        <Button
          onClick={() => handleSend(true)}
          disabled={loading}
          className="flex-1 gap-2"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Invio in corso…' : 'Invia ora'}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSend(false)}
          disabled={loading}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Salva bozza
        </Button>
      </div>
    </div>
  )
}
