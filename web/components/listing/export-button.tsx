'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="h-8 gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
    >
      <Download className="h-3.5 w-3.5" />
      {loading ? 'Esportando…' : 'Export XML'}
    </Button>
  )
}
