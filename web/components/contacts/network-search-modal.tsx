'use client'

import { useState, useCallback } from 'react'
import { Search, Building2, Phone, Mail, Euro, X, Loader2, ArrowLeft, ChevronRight, Send } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NetworkContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  types: string[] | null
  type: string
  budget_min: number | null
  budget_max: number | null
  workspace_id: string
  created_at: string
}

interface Workspace {
  id: string
  name: string
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-100 text-blue-700',
  seller: 'bg-emerald-100 text-emerald-700',
  renter: 'bg-purple-100 text-purple-700',
  landlord: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  const fmt = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `fino a ${fmt(max)}`
  if (min) return `da ${fmt(min)}`
  return null
}

interface EditField {
  key: string
  label: string
  oldValue: string
  newValue: string
}

interface NetworkSearchModalProps {
  open: boolean
  onClose: () => void
}

export function NetworkSearchModal({ open, onClose }: NetworkSearchModalProps) {
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<NetworkContact[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [searched, setSearched] = useState(false)

  // Detail view
  const [detailContact, setDetailContact] = useState<NetworkContact | null>(null)
  const [detailOwner, setDetailOwner] = useState<string>('')

  // Edit proposal
  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState<EditField[]>([])
  const [editNote, setEditNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/contacts/network-search?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResults(data.contacts ?? [])
      setWorkspaces(data.workspaces ?? [])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [q, typeFilter])

  function openDetail(contact: NetworkContact) {
    const ws = workspaces.find((w) => w.id === contact.workspace_id)
    setDetailContact(contact)
    setDetailOwner(ws?.name ?? 'Agenzia')
    setEditMode(false)
    setEditFields([
      { key: 'name', label: 'Nome', oldValue: contact.name, newValue: contact.name },
      { key: 'email', label: 'Email', oldValue: contact.email ?? '', newValue: contact.email ?? '' },
      { key: 'phone', label: 'Telefono', oldValue: contact.phone ?? '', newValue: contact.phone ?? '' },
    ])
    setEditNote('')
  }

  function updateEditField(key: string, newValue: string) {
    setEditFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, newValue } : f))
    )
  }

  async function handleSubmitEdit() {
    if (!detailContact) return
    const changedFields = editFields.filter((f) => f.newValue.trim() !== f.oldValue.trim())
    if (changedFields.length === 0) {
      toast.info('Nessuna modifica da proporre')
      return
    }
    const changes: Record<string, { old: string; new: string }> = {}
    for (const f of changedFields) {
      changes[f.key] = { old: f.oldValue, new: f.newValue.trim() }
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/contacts/edit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: detailContact.id,
          changes,
          note: editNote || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Proposta di modifica inviata! L\'agenzia proprietaria riceverà una notifica.')
      setDetailContact(null)
      setEditMode(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setQ('')
    setTypeFilter('')
    setResults([])
    setSearched(false)
    setDetailContact(null)
    setEditMode(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detailContact ? (
              <button
                onClick={() => setDetailContact(null)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-normal mr-1 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Indietro
              </button>
            ) : null}
            <span>
              {detailContact
                ? editMode ? 'Proponi modifica' : 'Dettaglio contatto'
                : 'Ricerca Avanzata Network'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Search view */}
          {!detailContact && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cerca contatti nelle agenzie con cui è attiva la condivisione.
              </p>

              {/* Search bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome, email o telefono..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? '')}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo contatto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tutti i tipi</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Cerca
                </Button>
              </div>

              {/* Results */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searched && results.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nessun contatto trovato
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{results.length} contatti trovati</p>
                  {results.map((contact) => {
                    const ws = workspaces.find((w) => w.id === contact.workspace_id)
                    const types = contact.types ?? [contact.type]
                    const budget = formatBudget(contact.budget_min, contact.budget_max)
                    return (
                      <button
                        key={contact.id}
                        onClick={() => openDetail(contact)}
                        className="w-full text-left rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{contact.name}</span>
                            <div className="flex gap-1">
                              {types.map((t) => (
                                <span key={t} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[t] ?? TYPE_COLORS.other)}>
                                  {TYPE_LABELS[t] ?? t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                            {budget && (
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {budget}
                              </span>
                            )}
                            {ws && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {ws.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      </button>
                    )
                  })}
                </div>
              ) : !searched ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Inserisci un termine di ricerca e premi Cerca
                </div>
              ) : null}
            </div>
          )}

          {/* Detail view */}
          {detailContact && !editMode && (
            <div className="space-y-4">
              {/* Owner badge */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg bg-muted/40 px-3 py-2 border border-border">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>Questo contatto appartiene a <strong>{detailOwner}</strong></span>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Nome</p>
                  <p className="font-semibold text-base">{detailContact.name}</p>
                </div>
                {detailContact.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                    <p className="flex items-center gap-1.5 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {detailContact.email}
                    </p>
                  </div>
                )}
                {detailContact.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Telefono</p>
                    <p className="flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {detailContact.phone}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(detailContact.types ?? [detailContact.type]).map((t) => (
                      <Badge key={t} variant="secondary" className={cn(TYPE_COLORS[t] ?? TYPE_COLORS.other)}>
                        {TYPE_LABELS[t] ?? t}
                      </Badge>
                    ))}
                  </div>
                </div>
                {(detailContact.budget_min || detailContact.budget_max) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                    <p className="flex items-center gap-1.5 text-sm">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatBudget(detailContact.budget_min, detailContact.budget_max)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                  Proponi modifica
                </Button>
              </div>
            </div>
          )}

          {/* Edit proposal view */}
          {detailContact && editMode && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Proponi una modifica ai dati del contatto. La richiesta verrà inviata all&apos;agenzia <strong>{detailOwner}</strong> per approvazione.
              </p>

              {editFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={field.oldValue}
                      readOnly
                      className="opacity-50 text-xs"
                      placeholder="—"
                    />
                    <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      value={field.newValue}
                      onChange={(e) => updateEditField(field.key, e.target.value)}
                      placeholder="Nuovo valore"
                      className={cn(field.newValue !== field.oldValue && 'border-orange-400 ring-1 ring-orange-200')}
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label>Nota (opzionale)</Label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Aggiungi una nota per l'agenzia..."
                  rows={2}
                />
              </div>

              <div className="flex justify-between pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Annulla
                </Button>
                <Button size="sm" onClick={handleSubmitEdit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Invia proposta
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
