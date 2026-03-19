'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  proprietario: 'Proprietario',
  moglie_marito: 'Moglie/Marito',
  figlio_figlia: 'Figlio/Figlia',
  vicino: 'Vicino',
  portiere: 'Portiere',
  amministratore: 'Amministratore',
  avvocato: 'Avvocato',
  commercialista: 'Commercialista',
  precedente_proprietario: 'Ex proprietario',
  inquilino: 'Inquilino',
  altro: 'Altro',
}

interface AddContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  onAdded: () => void
}

export const AddContactDialog = React.memo(function AddContactDialog({
  open,
  onOpenChange,
  propertyId,
  onAdded,
}: AddContactDialogProps) {
  const [contactSearch, setContactSearch] = useState('')
  const [contactRole, setContactRole] = useState('altro')
  const [contactNotes, setContactNotes] = useState('')
  const [contactResults, setContactResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)
  const [addingContact, setAddingContact] = useState(false)

  async function searchContacts(q: string) {
    setContactSearch(q)
    if (q.length < 2) { setContactResults([]); return }
    const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      setContactResults((data.contacts ?? []).slice(0, 8))
    }
  }

  async function handleAddContact() {
    if (!selectedContact) return
    setAddingContact(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: selectedContact.id,
          role: contactRole,
          notes: contactNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast.success('Contatto aggiunto')
      onOpenChange(false)
      setSelectedContact(null)
      setContactSearch('')
      setContactRole('altro')
      setContactNotes('')
      onAdded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAddingContact(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi contatto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Cerca contatto</Label>
            <Input
              placeholder="Nome, telefono..."
              value={contactSearch}
              onChange={(e) => searchContacts(e.target.value)}
            />
            {contactResults.length > 0 && (
              <div className="rounded-lg border border-border max-h-40 overflow-auto">
                {contactResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedContact(c); setContactSearch(c.name); setContactResults([]) }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                  >
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedContact && (
              <p className="text-xs text-green-600 dark:text-green-400">✓ Selezionato: {selectedContact.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Ruolo *</Label>
            <Select value={contactRole} onValueChange={(v) => setContactRole(v ?? '')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Note (opzionale)</Label>
            <Input
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Es. Ha le chiavi, contattare dopo le 18..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleAddContact} disabled={!selectedContact || addingContact}>
            {addingContact ? 'Aggiungendo...' : 'Aggiungi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
