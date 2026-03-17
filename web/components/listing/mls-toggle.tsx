'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface MlsToggleProps {
  listingId: string
  initialShared: boolean
}

export function MlsToggle({ listingId, initialShared }: MlsToggleProps) {
  const [shared, setShared] = useState(initialShared)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_group: !shared }),
      })
      if (!res.ok) throw new Error()
      setShared(s => !s)
      toast.success(!shared ? 'Immobile condiviso con la rete' : 'Immobile rimosso dalla rete')
    } catch {
      toast.error('Errore nella modifica')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          shared ? 'bg-blue-600' : 'bg-muted'
        } ${loading ? 'opacity-50' : ''}`}
        role="switch"
        aria-checked={shared}
        aria-label="Condividi con la rete"
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            shared ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-sm text-neutral-700">Condividi con la rete</span>
      {shared && (
        <span className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-blue-600 font-medium">
          <Check className="h-3 w-3" />
          Visibile alla rete
        </span>
      )}
    </div>
  )
}
