'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface RestoreListingButtonProps {
  archivedId: string
  address: string
}

export function RestoreListingButton({ archivedId, address }: RestoreListingButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleRestore() {
    setLoading(true)
    try {
      const res = await fetch(`/api/archive/restore/${archivedId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore durante il ripristino')
        return
      }
      toast.success('Annuncio ripristinato come bozza')
      setOpen(false)
      router.push(`/listing/${data.listing_id}`)
    } catch {
      toast.error('Errore di rete durante il ripristino')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
          />
        }
      >
        <RotateCcw className="h-3 w-3" />
        Ripristina
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ripristinare l&apos;annuncio?</DialogTitle>
          <DialogDescription>
            L&apos;annuncio <strong>{address}</strong> verrà ripristinato come bozza nella sezione Annunci.
            L&apos;archivio originale rimarrà invariato.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleRestore} disabled={loading}>
            {loading ? 'Ripristino…' : 'Ripristina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
