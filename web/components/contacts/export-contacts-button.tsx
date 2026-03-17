'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ExportContactsButton() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/export')
      if (!res.ok) {
        toast.error('Errore durante l\'export')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] ?? 'clienti.csv'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Export completato')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={loading}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {loading ? 'Export…' : 'Esporta CSV'}
    </Button>
  )
}
