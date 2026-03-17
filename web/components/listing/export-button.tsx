'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export function ExportButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}/export`)
      if (!res.ok) {
        toast.error('Errore durante l\'export')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `immobile-${listingId.slice(0, 8)}.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('XML esportato')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" />
      {loading ? 'Esportando…' : 'Export XML'}
    </button>
  )
}
