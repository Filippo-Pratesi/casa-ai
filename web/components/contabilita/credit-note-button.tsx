'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  invoiceId: string
  numeroFattura: string
}

export function CreditNoteButton({ invoiceId, numeroFattura }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEmit() {
    if (!confirm(`Emettere una nota di credito per la fattura ${numeroFattura}? Verrà creata come bozza.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/credit-note`, { method: 'POST' })
      const d = await res.json()

      if (res.status === 409 && d.existing_id) {
        toast.info(`Nota di credito già esistente: ${d.error}`)
        router.push(`/contabilita/${d.existing_id}`)
        return
      }
      if (!res.ok) throw new Error(d.error ?? 'Errore')

      toast.success(`Nota di credito ${d.numero_fattura} creata`)
      router.push(`/contabilita/${d.id}/modifica`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore nella creazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-start text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950"
      onClick={handleEmit}
      disabled={loading}
    >
      {loading
        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        : <RotateCcw className="h-4 w-4 mr-2" />
      }
      Emetti nota di credito
    </Button>
  )
}
