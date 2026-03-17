'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function BulkExportButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/workspace/export')
      if (!res.ok) {
        toast.error('Errore durante l\'export')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-portali-${new Date().toISOString().slice(0, 10)}.xml`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export completato')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading} className="gap-2">
      <Download className="h-4 w-4" />
      {loading ? 'Esportando…' : 'Esporta tutti gli annunci (XML)'}
    </Button>
  )
}
