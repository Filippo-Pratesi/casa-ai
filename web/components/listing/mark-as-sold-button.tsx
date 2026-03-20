'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Contact {
  id: string
  name: string
  type: string
}

interface WorkspaceMember {
  id: string
  name: string
}

interface MarkAsSoldButtonProps {
  listingId: string
  address: string
  workspaceMembers: WorkspaceMember[]
}

type Step = 'buyer' | 'agent' | 'confirm_contact'

export function MarkAsSoldButton({ listingId, address, workspaceMembers }: MarkAsSoldButtonProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('buyer')
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [externalBuyerName, setExternalBuyerName] = useState('')
  const [isExternal, setIsExternal] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>(workspaceMembers[0]?.id ?? '')
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setLoadingContacts(true)
      fetch('/api/contacts?types=buyer&limit=100')
        .then((r) => r.json())
        .then((d) => {
          setContacts((d.contacts ?? []) as Contact[])
        })
        .catch(() => setContacts([]))
        .finally(() => setLoadingContacts(false))
    }
  }, [open])

  function reset() {
    setStep('buyer')
    setSelectedContact(null)
    setExternalBuyerName('')
    setIsExternal(false)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) reset()
  }

  async function handleSubmit(archiveContact: boolean) {
    setLoading(true)
    try {
      const buyerName = isExternal ? externalBuyerName.trim() : (selectedContact?.name ?? null)
      const res = await fetch(`/api/listing/${listingId}/sold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sold_by_agent_id: selectedAgentId || null,
          buyer_contact_id: (!isExternal && selectedContact) ? selectedContact.id : null,
          buyer_name: buyerName,
          remove_contact: archiveContact,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Errore nella registrazione')
        return
      }
      toast.success('Immobile segnato come venduto')

      // Fire-and-forget: generate AI thank-you email draft if we have a buyer name
      if (buyerName) {
        fetch(`/api/listing/${listingId}/thankyou-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyer_name: buyerName,
            buyer_contact_id: (!isExternal && selectedContact) ? selectedContact.id : null,
            address,
            transaction_type: 'sold',
          }),
        })
          .then(r => r.ok
            ? toast.success('Bozza email di ringraziamento creata in Campagne', { duration: 4000 })
            : null
          )
          .catch(() => null)
      }

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
        className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Venduto
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registra vendita</DialogTitle>
          </DialogHeader>

          {/* STEP: buyer */}
          {step === 'buyer' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">«{address}» — A chi è stato venduto?</p>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    checked={!isExternal}
                    onChange={() => setIsExternal(false)}
                    className="accent-green-600"
                  />
                  Cliente nel DB
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    checked={isExternal}
                    onChange={() => setIsExternal(true)}
                    className="accent-green-600"
                  />
                  Esterno
                </label>
              </div>

              {!isExternal ? (
                loadingContacts ? (
                  <p className="text-xs text-muted-foreground">Carico clienti…</p>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedContact?.id ?? ''}
                      onChange={(e) => {
                        const c = contacts.find((x) => x.id === e.target.value) ?? null
                        setSelectedContact(c)
                      }}
                      className="w-full appearance-none rounded-lg border border-border bg-background py-1.5 pl-3 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                    >
                      <option value="">— Nessun cliente —</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  </div>
                )
              ) : (
                <input
                  type="text"
                  value={externalBuyerName}
                  onChange={(e) => setExternalBuyerName(e.target.value)}
                  placeholder="Nome acquirente esterno"
                  className="w-full rounded-lg border border-border bg-background py-1.5 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                />
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => setStep('agent')}
                  className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                >
                  Avanti
                </button>
              </div>
            </div>
          )}

          {/* STEP: agent */}
          {step === 'agent' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Chi ha effettuato la vendita?</p>
              <div className="relative">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background py-1.5 pl-3 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                >
                  {workspaceMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setStep('buyer')}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Indietro
                </button>
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Annulla
                </button>
                {selectedContact ? (
                  <button
                    onClick={() => setStep('confirm_contact')}
                    className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    Avanti
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {loading ? 'Salvo…' : 'Conferma vendita'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP: confirm_contact */}
          {step === 'confirm_contact' && selectedContact && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vuoi archiviare <strong>{selectedContact.name}</strong> come cliente non più interessato?
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleOpenChange(false)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Salvo…' : 'No, tieni cliente'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="rounded-md bg-[oklch(0.57_0.20_33)] px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Salvo…' : 'Sì, archivia cliente'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
