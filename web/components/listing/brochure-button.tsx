'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'

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
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? 'Generando…' : 'Brochure PDF'}
    </button>
  )
}
