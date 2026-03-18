'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, FileText, Paperclip, X, Mail, MessageCircle } from 'lucide-react'
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

interface CampaignComposerProps {
  cities: string[]
  totalContacts: number
}

export function CampaignComposer({ cities, totalContacts }: CampaignComposerProps) {
  const router = useRouter()
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
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
    if (channel === 'email' && !subject.trim()) {
      toast.error('Inserisci l\'oggetto della email')
      return
    }
    if (!body.trim()) {
      toast.error('Compila il testo del messaggio')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          subject: subject.trim(),
          body_html: channel === 'email' ? body.replace(/\n/g, '<br/>') : body,
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
        toast.success(channel === 'whatsapp'
          ? `Link WhatsApp generato per ${data.sent} contatti`
          : `Campagna inviata a ${data.sent} contatti`)
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
        <Link href="/campaigns" className="rounded-lg p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Nuova campagna</h1>
          <p className="text-sm text-muted-foreground">
            {channel === 'whatsapp' ? `${totalContacts} contatti con numero di telefono` : `${totalContacts} contatti con email disponibili`}
          </p>
        </div>
      </div>

      {/* Channel selector */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Canale</label>
        <div className="flex gap-2">
          <button
            onClick={() => setChannel('email')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              channel === 'email'
                ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)] text-white'
                : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={() => setChannel('whatsapp')}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              channel === 'whatsapp'
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:border-green-600/50 hover:text-foreground'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
        {channel === 'whatsapp' && (
          <p className="mt-2 text-xs text-muted-foreground">
            La campagna WhatsApp genera un testo pre-compilato che aprirai in WhatsApp Web per ogni contatto con numero di telefono.
          </p>
        )}
      </div>

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

      {/* Subject — email only */}
      {channel === 'email' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Oggetto *</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Oggetto della email…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
          />
        </div>
      )}

      {/* Body */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          {channel === 'whatsapp' ? 'Messaggio WhatsApp *' : 'Testo *'}
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={10}
          placeholder={channel === 'whatsapp' ? 'Scrivi il messaggio WhatsApp…' : 'Scrivi qui il corpo della mail…'}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)] resize-none font-mono"
        />
      </div>

      {/* Attachment — email only */}
      {channel === 'email' && (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Allegato (opzionale)</label>
          {attachmentFile ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">{attachmentFile.name}</span>
              <button onClick={removeAttachment} className="rounded p-0.5 hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors"
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
      )}

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

      {/* WhatsApp info */}
      {channel === 'whatsapp' && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-900/10 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-green-800 dark:text-green-300">Come funziona la campagna WhatsApp</p>
          <p className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
            Dopo aver salvato, potrai aprire WhatsApp Web per ogni contatto con numero di telefono. Il messaggio sarà pre-compilato e pronto da inviare.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSend(true)}
          disabled={loading}
          className={`inline-flex items-center justify-center gap-2 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            channel === 'whatsapp'
              ? 'bg-green-600 hover:bg-green-700 text-white transition-colors'
              : 'btn-ai'
          }`}
        >
          {channel === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {loading ? 'Salvataggio…' : channel === 'whatsapp' ? 'Salva campagna WhatsApp' : 'Invia ora'}
        </button>
        <button
          onClick={() => handleSend(false)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          <FileText className="h-4 w-4" />
          Salva bozza
        </button>
      </div>
    </div>
  )
}
