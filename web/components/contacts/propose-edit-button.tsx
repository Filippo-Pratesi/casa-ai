'use client'

import { useState } from 'react'
import { PenLine, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ProposeEditButtonProps {
  contactId: string
  contactName: string
}

export function ProposeEditButton({ contactId, contactName }: ProposeEditButtonProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!note.trim()) {
      toast.error('Descrivi la modifica richiesta')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          changes: { description: note.trim() },
          note: note.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore nell\'invio della richiesta')
      } else {
        toast.success('Richiesta inviata — l\'agenzia proprietaria riceverà una notifica')
        setNote('')
        setOpen(false)
      }
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
      >
        <PenLine className="h-4 w-4" />
        Proponi modifica
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proponi modifica — {contactName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Descrivi le modifiche da apportare al contatto. L&apos;agenzia proprietaria riceverà una notifica e potrà approvare o rifiutare.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es: aggiornare il numero di telefono a +39 333 123456, correggere il cognome in Bianchi…"
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Annulla
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !note.trim()}>
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Invio…</>
                  : <><Send className="h-4 w-4 mr-1" />Invia richiesta</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
