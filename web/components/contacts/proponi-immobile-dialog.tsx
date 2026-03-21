'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Search, Home, AlertTriangle, Mail, MessageCircle, X, Loader2, Euro, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Property {
  id: string
  address: string
  city: string
  zone: string | null
  property_type: string | null
  transaction_type: string | null
  estimated_value: number | null
  sqm: number | null
  rooms: number | null
  bathrooms: number | null
  stage: string | null
}

interface ProponiImmobileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}
const STAGE_LABELS: Record<string, string> = {
  sconosciuto: 'Sconosciuto', ignoto: 'Non contattato', conosciuto: 'Conosciuto',
  incarico: 'Incarico', venduto: 'Venduto', locato: 'Locato',
}
const TX_LABELS: Record<string, string> = { vendita: 'Vendita', affitto: 'Affitto' }

function buildTemplate(contact: { name: string }, prop: Property): string {
  const typeLabel = PROPERTY_TYPE_LABELS[prop.property_type ?? ''] ?? 'Immobile'
  const txLabel   = TX_LABELS[prop.transaction_type ?? ''] ?? ''
  const price     = prop.estimated_value
    ? `€${prop.estimated_value.toLocaleString('it-IT')}`
    : null
  const details = [
    prop.sqm ? `${prop.sqm} m²` : null,
    prop.rooms ? `${prop.rooms} locali` : null,
    prop.bathrooms ? `${prop.bathrooms} bagni` : null,
  ].filter(Boolean).join(' · ')

  const firstName = contact.name.split(' ')[0]

  return `Gentile ${firstName},

ho pensato a lei per un immobile che potrebbe corrispondere alle sue esigenze.

📍 ${prop.address}, ${prop.city}${prop.zone ? ` (${prop.zone})` : ''}
🏠 ${typeLabel}${txLabel ? ` in ${txLabel.toLowerCase()}` : ''}${details ? ` · ${details}` : ''}${price ? `\n💰 ${price}` : ''}

Sarei lieto/a di organizzarle una visita in qualsiasi momento a lei conveniente.

Rimango a disposizione per qualsiasi informazione aggiuntiva.

Cordiali saluti`
}

export function ProponiImmobileDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  contactPhone,
}: ProponiImmobileDialogProps) {
  const [method, setMethod]           = useState<'email' | 'whatsapp'>('email')
  const [addressQuery, setAddressQuery] = useState('')
  const [filters, setFilters]         = useState({
    city: '', property_type: '', transaction_type: '',
    price_max: '', rooms_min: '',
  })
  const [properties, setProperties]   = useState<Property[]>([])
  const [searching, setSearching]     = useState(false)
  const [selected, setSelected]       = useState<Property | null>(null)
  const [alreadySuggested, setAlreadySuggested] = useState<Set<string>>(new Set())
  const [message, setMessage]         = useState('')
  const [sending, setSending]         = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load already-suggested property ids
  useEffect(() => {
    if (!open) return
    fetch(`/api/contacts/${contactId}/suggest-property`)
      .then(r => r.json())
      .then((d: { suggestedPropertyIds: string[] }) => {
        setAlreadySuggested(new Set(d.suggestedPropertyIds ?? []))
      })
      .catch(() => {})
  }, [open, contactId])

  const search = useCallback(async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (addressQuery) params.set('address', addressQuery)
      if (filters.city) params.set('city', filters.city)
      if (filters.property_type) params.set('property_type', filters.property_type)
      if (filters.transaction_type) params.set('transaction_type', filters.transaction_type)
      if (filters.price_max) params.set('price_max', filters.price_max)
      if (filters.rooms_min) params.set('rooms_min', filters.rooms_min)
      const res = await fetch(`/api/banca-dati/search?${params}`)
      const data = await res.json() as { properties: Property[] }
      setProperties(data.properties ?? [])
    } catch {
      toast.error('Errore nella ricerca immobili')
    } finally {
      setSearching(false)
    }
  }, [addressQuery, filters])

  // Debounce address input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { search() }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // When property selected, build template
  const handleSelectProperty = (prop: Property) => {
    setSelected(prop)
    setMessage(buildTemplate({ name: contactName }, prop))
  }

  const handleSend = async () => {
    if (!selected) return
    if (method === 'email' && !contactEmail) {
      toast.error('Il contatto non ha un indirizzo email')
      return
    }
    if (method === 'whatsapp') {
      // Open wa.me in new tab, then record server-side
      const phone = contactPhone?.replace(/\D/g, '')
      if (!phone) { toast.error('Il contatto non ha un numero di telefono'); return }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    setSending(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/suggest-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: selected.id, method, message }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      toast.success(method === 'email' ? 'Email inviata con successo' : 'Messaggio registrato')
      setAlreadySuggested(prev => new Set([...prev, selected.id]))
      onOpenChange(false)
      // Reset
      setSelected(null); setMessage(''); setAddressQuery(''); setProperties([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore invio')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Proponi un immobile a {contactName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Method selector */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Metodo di invio
            </Label>
            <div className="flex gap-2">
              <button
                onClick={() => setMethod('email')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  method === 'email'
                    ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33/0.08)] text-[oklch(0.57_0.20_33)]'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Mail className="h-4 w-4" />
                Email
              </button>
              <button
                onClick={() => setMethod('whatsapp')}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  method === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>
            </div>
            {method === 'email' && !contactEmail && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Il contatto non ha un&apos;email — aggiungila prima di inviare
              </p>
            )}
          </div>

          {/* Search */}
          {!selected && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Cerca immobile
              </Label>

              {/* Address text search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per via o indirizzo…"
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Città"
                  value={filters.city}
                  onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                />
                <select
                  value={filters.property_type}
                  onChange={e => setFilters(f => ({ ...f, property_type: e.target.value }))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Tutti i tipi</option>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <select
                  value={filters.transaction_type}
                  onChange={e => setFilters(f => ({ ...f, transaction_type: e.target.value }))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Vendita + Affitto</option>
                  <option value="vendita">Vendita</option>
                  <option value="affitto">Affitto</option>
                </select>
                <Input
                  placeholder="Prezzo max €"
                  type="number"
                  value={filters.price_max}
                  onChange={e => setFilters(f => ({ ...f, price_max: e.target.value }))}
                />
                <Input
                  placeholder="Locali min"
                  type="number"
                  value={filters.rooms_min}
                  onChange={e => setFilters(f => ({ ...f, rooms_min: e.target.value }))}
                />
              </div>

              {/* Results */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {searching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!searching && properties.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nessun immobile trovato. Prova a modificare i filtri.
                  </p>
                )}
                {!searching && properties.map(prop => {
                  const warned = alreadySuggested.has(prop.id)
                  return (
                    <button
                      key={prop.id}
                      onClick={() => handleSelectProperty(prop)}
                      className="w-full text-left rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{prop.address}</p>
                          <p className="text-xs text-muted-foreground">{prop.city}{prop.zone ? ` · ${prop.zone}` : ''}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {prop.estimated_value && (
                              <span className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
                                <Euro className="h-3 w-3" />
                                {prop.estimated_value.toLocaleString('it-IT')}
                              </span>
                            )}
                            {prop.sqm && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Maximize2 className="h-3 w-3" />{prop.sqm} m²
                              </span>
                            )}
                            {prop.rooms && <span className="text-xs text-muted-foreground">{prop.rooms} loc.</span>}
                            {prop.property_type && (
                              <Badge variant="secondary" className="text-[10px] rounded-full px-1.5 py-0">
                                {PROPERTY_TYPE_LABELS[prop.property_type] ?? prop.property_type}
                              </Badge>
                            )}
                            {prop.stage && (
                              <Badge variant="outline" className="text-[10px] rounded-full px-1.5 py-0">
                                {STAGE_LABELS[prop.stage] ?? prop.stage}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {warned && (
                          <div className="flex items-center gap-1 shrink-0 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            Già proposto
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selected property + message editor */}
          {selected && (
            <div className="space-y-4">
              {/* Selected card */}
              <div className="relative rounded-xl border border-[oklch(0.57_0.20_33/0.4)] bg-[oklch(0.57_0.20_33/0.05)] px-4 py-3">
                <button
                  onClick={() => { setSelected(null); setMessage('') }}
                  className="absolute right-2 top-2 rounded-md p-1 hover:bg-muted transition-colors"
                  aria-label="Cambia immobile"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <p className="text-sm font-semibold text-foreground pr-6">{selected.address}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.city}
                  {selected.estimated_value ? ` · €${selected.estimated_value.toLocaleString('it-IT')}` : ''}
                  {selected.sqm ? ` · ${selected.sqm} m²` : ''}
                  {selected.rooms ? ` · ${selected.rooms} loc.` : ''}
                </p>
                {alreadySuggested.has(selected.id) && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Attenzione: questo immobile è già stato proposto a {contactName}
                  </div>
                )}
              </div>

              {/* Message editor */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Messaggio
                </Label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={12}
                  className="resize-none text-sm font-mono"
                />
              </div>

              {/* Send button */}
              <div className="flex justify-end gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setSelected(null); setMessage('') }}
                >
                  Cambia immobile
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                  className={`${
                    method === 'whatsapp'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.52_0.20_33)] text-white'
                  }`}
                >
                  {sending
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Invio…</>
                    : method === 'whatsapp'
                      ? <><MessageCircle className="h-4 w-4 mr-1.5" />Apri WhatsApp</>
                      : <><Mail className="h-4 w-4 mr-1.5" />Invia Email</>
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
