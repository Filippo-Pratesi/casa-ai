'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteListingButtonProps {
  listingId: string
  address: string
}

export function DeleteListingButton({ listingId, address }: DeleteListingButtonProps) {
  const [open, setOpen] = useState(false)
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
      setOpen(false)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Elimina annuncio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare <strong>«{address}»</strong>? Questa azione non può essere annullata.
          </p>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Elimino…' : 'Sì, elimina'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
