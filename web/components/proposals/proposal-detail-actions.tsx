'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProposalDetailActions({ proposalId }: { proposalId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRespond(action: 'accettata' | 'rifiutata') {
    if (!confirm(`Vuoi segnare questa proposta come "${action}"?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Errore')
      toast.success(action === 'accettata' ? 'Proposta accettata!' : 'Proposta rifiutata')
      router.refresh()
    } catch {
      toast.error("Errore nell'aggiornamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Azioni</h2>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        onClick={() => handleRespond('accettata')}
        disabled={loading}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Segna come accettata
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        onClick={() => handleRespond('rifiutata')}
        disabled={loading}
      >
        <XCircle className="h-4 w-4 mr-2" />
        Segna come rifiutata
      </Button>
    </div>
  )
}
