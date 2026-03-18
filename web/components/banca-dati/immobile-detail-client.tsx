'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, User, Phone, Mail, ExternalLink, ChevronRight,
  Plus, Trash2, Loader2, Edit, Home, Megaphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { PropertyStageBadge, type PropertyStage, STAGE_CONFIG } from './property-stage-icon'
import { DispositionIcon, type OwnerDisposition } from './disposition-icon'
import { EventTimeline, type PropertyEvent } from './event-timeline'
import { PropertyCard } from './property-card'

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

const STAGE_ADVANCES: Record<PropertyStage, PropertyStage | null> = {
  sconosciuto: 'ignoto',
  ignoto: 'conosciuto',
  conosciuto: 'incarico',
  incarico: 'venduto',
  venduto: null,
  locato: 'disponibile',
  disponibile: 'locato',
}

const ADVANCE_LABELS: Record<string, string> = {
  ignoto: 'Segna come Ignoto',
  conosciuto: 'Segna come Conosciuto',
  incarico: 'Avvia Incarico',
  venduto: 'Segna come Venduto',
  locato: 'Segna come Locato',
  disponibile: 'Segna come Disponibile',
}

interface PropertyContact {
  id: string
  role: string
  is_primary: boolean
  notes: string | null
  contact: { id: string; name: string; phone: string | null; email: string | null } | null
}

interface NearbyResult {
  same_building: unknown[]
  nearby: unknown[]
}

interface ImmobileDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any
  propertyContacts: PropertyContact[]
  events: PropertyEvent[]
  nearby: NearbyResult
  isAdmin: boolean
  isOwner: boolean
}

export function ImmobileDetailClient({
  property: initialProperty,
  propertyContacts: initialContacts,
  events: initialEvents,
  nearby,
  isAdmin,
  isOwner,
}: ImmobileDetailClientProps) {
  const router = useRouter()
  const [property, setProperty] = useState(initialProperty)
  const [contacts, setContacts] = useState(initialContacts)
  const [events, setEvents] = useState(initialEvents)
  const [advancing, setAdvancing] = useState(false)

  // Add contact dialog
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactRole, setContactRole] = useState('altro')
  const [contactNotes, setContactNotes] = useState('')
  const [contactResults, setContactResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)
  const [addingContact, setAddingContact] = useState(false)

  const canAdvance = isAdmin || isOwner
  const nextStage = STAGE_ADVANCES[property.stage as PropertyStage]
  const config = STAGE_CONFIG[property.stage as PropertyStage]

  async function handleAdvanceStage() {
    if (!nextStage) return
    setAdvancing(true)
    try {
      const res = await fetch(`/api/properties/${property.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_stage: nextStage }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { property: updated } = await res.json()
      setProperty(updated)
      toast.success(`Stage aggiornato a: ${STAGE_CONFIG[nextStage as PropertyStage]?.label}`)
      // Reload events
      const evRes = await fetch(`/api/properties/${property.id}/events`)
      if (evRes.ok) {
        const evData = await evRes.json()
        setEvents(evData.events ?? [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAdvancing(false)
    }
  }

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
      const res = await fetch(`/api/properties/${property.id}/contacts`, {
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
      setAddContactOpen(false)
      setSelectedContact(null)
      setContactSearch('')
      setContactRole('altro')
      setContactNotes('')
      // Reload contacts
      const cRes = await fetch(`/api/properties/${property.id}/contacts`)
      if (cRes.ok) {
        const cData = await cRes.json()
        setContacts(cData.contacts ?? [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAddingContact(false)
    }
  }

  async function handleRemoveContact(linkId: string) {
    try {
      const res = await fetch(`/api/properties/${property.id}/contacts/${linkId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Errore')
      setContacts((prev) => prev.filter((c) => c.id !== linkId))
      toast.success('Contatto rimosso')
    } catch {
      toast.error('Errore nella rimozione')
    }
  }

  async function handlePromoteToListing() {
    try {
      const res = await fetch(`/api/properties/${property.id}/promote-to-listing`, { method: 'POST' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { listing_id } = await res.json()
      toast.success('Annuncio creato! Completa con foto e descrizione.')
      router.push(`/listing/${listing_id}/edit`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    }
  }

  const reloadEvents = useCallback(async () => {
    const res = await fetch(`/api/properties/${property.id}/events`)
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events ?? [])
    }
  }, [property.id])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link href="/banca-dati"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{property.address}</h1>
            <PropertyStageBadge stage={property.stage} />
            <DispositionIcon disposition={property.owner_disposition} showLabel />
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{property.city}{property.zone ? ` · ${property.zone}` : ''}{property.sub_zone ? ` / ${property.sub_zone}` : ''}</span>
          </div>
        </div>

        {/* Primary action */}
        <div className="flex gap-2 shrink-0">
          {canAdvance && nextStage && (
            <Button onClick={handleAdvanceStage} disabled={advancing} size="sm">
              {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {ADVANCE_LABELS[nextStage] ?? `→ ${nextStage}`}
            </Button>
          )}
          {property.stage === 'incarico' && !property.listing_id && (
            <Button variant="outline" size="sm" onClick={handlePromoteToListing}>
              <Megaphone className="h-4 w-4 mr-1.5" />
              Crea annuncio
            </Button>
          )}
          {property.listing_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/listing/${property.listing_id}`}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Vedi annuncio
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main layout: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* Left column — property data */}
        <div className="space-y-4">

          {/* Details card */}
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Dettagli immobile</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {property.property_type && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{property.property_type}</span></div>}
              {property.sqm && <div><span className="text-muted-foreground">Superficie:</span> <span className="font-medium">{property.sqm} mq</span></div>}
              {property.rooms && <div><span className="text-muted-foreground">Locali:</span> <span className="font-medium">{property.rooms}</span></div>}
              {property.bathrooms && <div><span className="text-muted-foreground">Bagni:</span> <span className="font-medium">{property.bathrooms}</span></div>}
              {property.floor != null && <div><span className="text-muted-foreground">Piano:</span> <span className="font-medium">{property.floor}{property.total_floors ? `/${property.total_floors}` : ''}</span></div>}
              {property.condition && <div><span className="text-muted-foreground">Condizioni:</span> <span className="font-medium capitalize">{property.condition.replace('_', ' ')}</span></div>}
              {property.estimated_value && <div><span className="text-muted-foreground">Valutazione:</span> <span className="font-medium">€{property.estimated_value.toLocaleString('it-IT')}</span></div>}
              {property.transaction_type && <div><span className="text-muted-foreground">Operazione:</span> <span className="font-medium capitalize">{property.transaction_type}</span></div>}
              {property.doorbell && <div><span className="text-muted-foreground">Campanello:</span> <span className="font-medium">{property.doorbell}</span></div>}
            </div>
            {property.building_notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Note palazzo: </span>
                <span>{property.building_notes}</span>
              </div>
            )}
          </Card>

          {/* Owner contact */}
          {property.owner_contact && (
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">Proprietario</h2>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {property.owner_contact.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{property.owner_contact.name}</p>
                    {property.owner_contact.phone && (
                      <p className="text-xs text-muted-foreground">{property.owner_contact.phone}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/contacts/${property.owner_contact.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Property contacts */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Contatti immobile</h2>
              <Button variant="outline" size="sm" onClick={() => setAddContactOpen(true)} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Aggiungi
              </Button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun contatto associato</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((pc) => (
                  <div key={pc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                        {pc.contact?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pc.contact?.name ?? 'Sconosciuto'}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[pc.role] ?? pc.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {pc.contact?.phone && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={`tel:${pc.contact.phone}`}><Phone className="h-3 w-3" /></a>
                        </Button>
                      )}
                      {pc.contact?.id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link href={`/contacts/${pc.contact.id}`}><ExternalLink className="h-3 w-3" /></Link>
                        </Button>
                      )}
                      {(isAdmin || isOwner) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveContact(pc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Incarico details */}
          {property.stage === 'incarico' && (
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">Incarico</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {property.incarico_type && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{property.incarico_type}</span></div>}
                {property.incarico_date && <div><span className="text-muted-foreground">Data firma:</span> <span className="font-medium">{new Date(property.incarico_date).toLocaleDateString('it-IT')}</span></div>}
                {property.incarico_expiry && <div><span className="text-muted-foreground">Scadenza:</span> <span className="font-medium">{new Date(property.incarico_expiry).toLocaleDateString('it-IT')}</span></div>}
                {property.incarico_commission_percent && <div><span className="text-muted-foreground">Provvigione:</span> <span className="font-medium">{property.incarico_commission_percent}%</span></div>}
              </div>
            </Card>
          )}

          {/* Rental details */}
          {property.stage === 'locato' && (
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">Locazione</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {property.lease_type && <div><span className="text-muted-foreground">Tipo contratto:</span> <span className="font-medium">{property.lease_type.replace('_plus_', '+')}</span></div>}
                {property.monthly_rent && <div><span className="text-muted-foreground">Canone:</span> <span className="font-medium">€{property.monthly_rent.toLocaleString('it-IT')}/mese</span></div>}
                {property.monthly_rent_discounted && <div><span className="text-muted-foreground">Canone agevolato:</span> <span className="font-medium">€{property.monthly_rent_discounted.toLocaleString('it-IT')}/mese</span></div>}
                {property.deposit && <div><span className="text-muted-foreground">Deposito:</span> <span className="font-medium">€{property.deposit.toLocaleString('it-IT')}</span></div>}
                {property.lease_start_date && <div><span className="text-muted-foreground">Inizio:</span> <span className="font-medium">{new Date(property.lease_start_date).toLocaleDateString('it-IT')}</span></div>}
                {property.lease_end_date && <div><span className="text-muted-foreground">Fine:</span> <span className="font-medium">{new Date(property.lease_end_date).toLocaleDateString('it-IT')}</span></div>}
              </div>
            </Card>
          )}

          {/* Nearby properties */}
          {((nearby.same_building?.length ?? 0) > 0 || (nearby.nearby?.length ?? 0) > 0) && (
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold text-sm">Immobili nelle vicinanze</h2>
              {(nearby.same_building?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stesso edificio</p>
                  <div className="grid gap-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(nearby.same_building as any[]).map((p) => (
                      <PropertyCard key={p.id} property={p} compact />
                    ))}
                  </div>
                </div>
              )}
              {(nearby.nearby?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entro 100m</p>
                  <div className="grid gap-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(nearby.nearby as any[]).map((p) => (
                      <PropertyCard key={p.id} property={p} compact />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column — cronistoria */}
        <div>
          <Card className="p-5 h-fit sticky top-6">
            <h2 className="font-semibold text-sm mb-4">Cronistoria</h2>
            <EventTimeline
              propertyId={property.id}
              events={events}
              onEventAdded={reloadEvents}
            />
          </Card>
        </div>
      </div>

      {/* Add contact dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
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
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>Annulla</Button>
            <Button onClick={handleAddContact} disabled={!selectedContact || addingContact}>
              {addingContact ? 'Aggiungendo...' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
