'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, Send, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InvoiceStatus } from './invoice-status-badge'

interface InvoiceDetailActionsProps {
  invoiceId: string
  status: InvoiceStatus
  clienteEmail: string | null
}

export function InvoiceDetailActions({ invoiceId, status, clienteEmail }: InvoiceDetailActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleMarkPaid() {
    setLoading('paid')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore')
      toast.success('Fattura segnata come pagata')
      router.refresh()
    } catch {
      toast.error("Errore nell'aggiornamento")
    } finally {
      setLoading(null)
    }
  }

  async function handleSend() {
    if (!clienteEmail) {
      toast.error('Nessun indirizzo email per questo cliente')
      return
    }
    if (!confirm(`Inviare la fattura a ${clienteEmail}?`)) return
    setLoading('send')
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore')
      toast.success('Fattura inviata via email')
      router.refresh()
    } catch {
      toast.error("Errore nell'invio")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Azioni</h2>
      {status === 'bozza' && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleSend}
          disabled={loading === 'send'}
        >
          <Send className="h-4 w-4 mr-2" />
          Invia via email
        </Button>
      )}
      {(status === 'inviata' || status === 'scaduta') && (
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          onClick={handleMarkPaid}
          disabled={loading === 'paid'}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Segna come pagata
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start"
        onClick={async () => {
          setLoading('dup')
          try {
            const res = await fetch(`/api/invoices/${invoiceId}/duplicate`, { method: 'POST' })
            if (!res.ok) throw new Error('Errore')
            const d = await res.json()
            toast.success(`Fattura duplicata: ${d.numero_fattura}`)
            router.push(`/contabilita/${d.id}/modifica`)
          } catch {
            toast.error('Errore nella duplicazione')
          } finally {
            setLoading(null)
          }
        }}
        disabled={loading === 'dup'}
      >
        <Copy className="h-4 w-4 mr-2" />
        Duplica fattura
      </Button>
    </div>
  )
}
