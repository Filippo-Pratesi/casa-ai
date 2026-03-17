'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NotifyBuyersButtonProps {
  listingId: string
  count: number
}

export function NotifyBuyersButton({ listingId, count }: NotifyBuyersButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleNotify() {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}/notify-buyers`, { method: 'POST' })
      if (res.ok) setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <p className="text-xs text-green-600 font-medium">
        Notifica inviata a {count} acquirent{count === 1 ? 'e' : 'i'}
      </p>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1.5"
      onClick={handleNotify}
      disabled={loading}
    >
      <Bell className="h-3 w-3" />
      {loading ? 'Invio…' : 'Notifica acquirenti'}
    </Button>
  )
}
