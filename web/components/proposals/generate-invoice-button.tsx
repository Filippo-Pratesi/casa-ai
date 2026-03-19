'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  proposalId: string
  proposalNumero: string
}

export function GenerateInvoiceButton({ proposalId, proposalNumero }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/generate-invoice`, { method: 'POST' })
      const d = await res.json()

      if (res.status === 409 && d.existing_id) {
        toast.info(`Fattura già esistente per questa proposta (${d.existing_id.slice(0, 8)}…)`)
        router.push(`/contabilita/${d.existing_id}`)
        return
      }
      if (!res.ok) throw new Error(d.error ?? 'Errore')

      toast.success(`Fattura ${d.numero_fattura} creata — compila i dati mancanti`)
      router.push(`/contabilita/${d.id}/modifica`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore nella generazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start text-[oklch(0.57_0.20_33)] dark:text-[oklch(0.73_0.18_36)] border-[oklch(0.57_0.20_33/0.3)] hover:bg-[oklch(0.57_0.20_33/0.08)]"
      onClick={handleGenerate}
      disabled={loading}
      title={`Genera fattura da proposta ${proposalNumero}`}
    >
      {loading
        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        : <Receipt className="h-4 w-4 mr-2" />
      }
      Genera fattura
    </Button>
  )
}
