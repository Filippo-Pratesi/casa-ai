'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function MarkNotificationsReadButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMark() {
    setLoading(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      toast.success('Tutte le notifiche segnate come lette')
      router.refresh()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleMark} disabled={loading} className="text-xs h-8">
      {loading ? 'Aggiorno…' : 'Segna tutto come letto'}
    </Button>
  )
}
