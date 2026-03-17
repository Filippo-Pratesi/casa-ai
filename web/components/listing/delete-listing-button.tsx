'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteListingButtonProps {
  listingId: string
  address: string
}

export function DeleteListingButton({ listingId, address }: DeleteListingButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sold: false }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Errore nella cancellazione')
        return
      }
      toast.success('Annuncio eliminato')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
      <span className="text-xs text-red-700 font-medium">Eliminare «{address}»?</span>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Elimino…' : 'Sì, elimina'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={loading}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        Annulla
      </button>
    </div>
  )
}
