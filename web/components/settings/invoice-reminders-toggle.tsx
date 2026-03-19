'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'

interface Props {
  enabled: boolean
}

export function InvoiceRemindersToggle({ enabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/workspace/invoice-reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_automatici: !enabled }),
      })
      if (!res.ok) throw new Error()
      setEnabled(v => !v)
      toast.success(enabled ? 'Solleciti automatici disattivati' : 'Solleciti automatici attivati')
    } catch {
      toast.error('Errore nel salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
          {enabled
            ? <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
            : <BellOff className="h-4 w-4 text-muted-foreground" />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Solleciti automatici di pagamento</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invia email automatiche ai clienti a 7 giorni prima della scadenza, il giorno stesso, e 7 e 30 giorni dopo.
          </p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={enabled ? 'Disattiva solleciti' : 'Attiva solleciti'}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 ${
          enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
