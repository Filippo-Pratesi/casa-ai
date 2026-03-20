'use client'

import React, { useState, useRef, useEffect } from 'react'
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
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

interface ContactResult {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface AddContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  onAdded: (info: { role: string; contactId: string; contactName: string }) => void
}

export const AddContactDialog = React.memo(function AddContactDialog({
  open,
  onOpenChange,
  propertyId,
  onAdded,
}: AddContactDialogProps) {
  const [mode, setMode] = useState<'search' | 'create'>('search')

  // Search mode state
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<ContactResult[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Create mode state
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newType, setNewType] = useState('seller')

  // Shared
  const [contactRole, setContactRole] = useState('proprietario')
  const [contactNotes, setContactNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Close results on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function resetAll() {
    setMode('search')
    setContactSearch('')
    setContactResults([])
    setSelectedContact(null)
    setShowResults(false)
    setNewFirstName('')
    setNewLastName('')
    setNewPhone('')
    setNewEmail('')
    setNewType('seller')
    setContactRole('proprietario')
    setContactNotes('')
  }

  async function searchContacts(q: string) {
    setContactSearch(q)
    setSelectedContact(null)
    if (q.length < 2) { setContactResults([]); setShowResults(false); return }
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}&perPage=8`)
      if (res.ok) {
        const data = await res.json()
        setContactResults(data.contacts ?? [])
        setShowResults(true)
      }
    } catch {
      // silently ignore search errors
    }
  }

  function selectContact(c: ContactResult) {
    setSelectedContact(c)
    setContactSearch(c.name)
    setShowResults(false)
    setContactResults([])
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let body: Record<string, unknown>

      if (mode === 'search') {
        if (!selectedContact) { toast.error('Seleziona un contatto'); setSubmitting(false); return }
        body = {
          contact_id: selectedContact.id,
          role: contactRole,
          notes: contactNotes.trim() || null,
        }
      } else {
        const firstName = newFirstName.trim()
        const lastName = newLastName.trim()
        const name = [firstName, lastName].filter(Boolean).join(' ')
        if (!name) { toast.error('Inserisci almeno il nome'); setSubmitting(false); return }
        body = {
          new_contact: {
            name,
            type: newType,
            phone: newPhone.trim() || null,
            email: newEmail.trim() || null,
          },
          role: contactRole,
          notes: contactNotes.trim() || null,
        }
      }

      const res = await fetch(`/api/properties/${propertyId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(error)
      }
      const { id: linkId, contact_id } = await res.json()
      void linkId
      const contactName = mode === 'search'
        ? selectedContact!.name
        : [newFirstName.trim(), newLastName.trim()].filter(Boolean).join(' ')
      const finalContactId = mode === 'search' ? selectedContact!.id : (contact_id ?? '')

      toast.success('Contatto aggiunto')
      onOpenChange(false)
      resetAll()
      onAdded({ role: contactRole, contactId: finalContactId, contactName })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aggiungi contatto</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
              mode === 'search' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="h-3 w-3" />
            Cerca esistente
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all',
              mode === 'create' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UserPlus className="h-3 w-3" />
            Crea nuovo
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'search' ? (
            <div className="space-y-1.5" ref={searchRef}>
              <Label>Cerca contatto</Label>
              <div className="relative">
                <Input
                  placeholder="Nome, telefono, email..."
                  value={contactSearch}
                  onChange={(e) => searchContacts(e.target.value)}
                  onFocus={() => contactResults.length > 0 && setShowResults(true)}
                  autoFocus
                />
                {contactSearch && (
                  <button
                    type="button"
                    onClick={() => { setContactSearch(''); setSelectedContact(null); setContactResults([]); setShowResults(false) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {showResults && contactResults.length > 0 && (
                <div className="rounded-lg border border-border max-h-48 overflow-auto shadow-md z-10 bg-popover">
                  {contactResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectContact(c)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.phone, c.email].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedContact && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{selectedContact.name}</p>
                    {selectedContact.phone && <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>}
                  </div>
                  <button type="button" onClick={() => { setSelectedContact(null); setContactSearch('') }} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input placeholder="Es. Mario" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Cognome</Label>
                  <Input placeholder="Es. Rossi" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Telefono</Label>
                  <Input type="tel" placeholder="Es. 333 1234567" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="mario@esempio.it" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo contatto</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Venditore</SelectItem>
                    <SelectItem value="buyer">Acquirente</SelectItem>
                    <SelectItem value="landlord">Proprietario affitto</SelectItem>
                    <SelectItem value="renter">Affittuario</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Ruolo nell&apos;immobile *</Label>
            <Select value={contactRole} onValueChange={setContactRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              placeholder="Es. Ha le chiavi, contattare dopo le 18..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetAll(); onOpenChange(false) }} disabled={submitting}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || (mode === 'search' && !selectedContact)}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
