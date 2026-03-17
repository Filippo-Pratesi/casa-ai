'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldX, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PrivacyConsentSectionProps {
  contactId: string
  initialConsent: boolean
  initialConsentDate: string | null
}

export function PrivacyConsentSection({
  contactId,
  initialConsent,
  initialConsentDate,
}: PrivacyConsentSectionProps) {
  const [consent, setConsent] = useState(initialConsent)
  const [consentDate, setConsentDate] = useState(initialConsentDate)
  const [updating, setUpdating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function toggleConsent() {
    setUpdating(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: !consent }),
      })
      const data = await res.json()
      if (res.ok) {
        setConsent(data.consent)
        setConsentDate(data.date)
        toast.success(data.consent ? 'Consenso registrato' : 'Consenso revocato')
      } else {
        toast.error(data.error ?? 'Errore aggiornamento')
      }
    } catch {
      toast.error('Errore di rete')
    } finally {
      setUpdating(false)
    }
  }

  async function downloadForm() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/privacy-form`)
      if (!res.ok) { toast.error('Errore nella generazione del PDF'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `privacy-form-${contactId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore di rete')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className={`rounded-xl border px-4 py-4 space-y-3 ${consent ? 'border-green-100 bg-green-50' : 'border-border bg-muted/30'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {consent
            ? <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
            : <ShieldX className="h-5 w-5 text-muted-foreground shrink-0" />
          }
          <div>
            <p className="text-sm font-semibold">Consenso al trattamento dati</p>
            {consent && consentDate ? (
              <p className="text-xs text-green-600 mt-0.5">
                Registrato il {new Date(consentDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Nessun consenso registrato</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={downloadForm}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60 transition-colors"
            title="Stampa modulo privacy"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Stampa modulo
          </button>
          <button
            type="button"
            onClick={toggleConsent}
            disabled={updating}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
              consent
                ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {updating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {consent ? 'Revoca consenso' : 'Registra consenso'}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Ai sensi del GDPR (Reg. UE 2016/679) — Il consenso viene registrato con data e ora.
        Stampa il modulo per la firma fisica del cliente.
      </p>
    </div>
  )
}
