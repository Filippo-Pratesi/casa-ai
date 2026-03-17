'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function BrochureButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}/brochure`)
      if (!res.ok) {
        toast.error('Errore nella generazione del PDF')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `annuncio-${listingId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="h-8 gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? 'Generando…' : 'Brochure PDF'}
    </Button>
  )
}
