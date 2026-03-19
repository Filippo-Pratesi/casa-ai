'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Phone, ExternalLink,
  Plus, Trash2, Loader2, Megaphone, FileDown, Pencil, AlertTriangle
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { PropertyStageBadge, type PropertyStage, STAGE_CONFIG } from './property-stage-icon'
import { DispositionIcon, DISPOSITION_CONFIG, type OwnerDisposition } from './disposition-icon'
import { EventTimeline, type PropertyEvent } from './event-timeline'
import { PropertyCard } from './property-card'
import { AiMatchPanel } from './ai-match-panel'

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

const PROPERTY_TYPE_IT: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

const STAGE_ADVANCES: Record<PropertyStage, PropertyStage | null> = {
  sconosciuto: 'ignoto',
  ignoto: 'conosciuto',
  conosciuto: 'incarico',
  incarico: null,  // computed dynamically from transaction_type (see nextStage below)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEvents(raw: any[]): PropertyEvent[] {
  return raw.map((e) => ({
    ...e,
    agent_name: (e.agent as { name?: string } | null)?.name ?? e.agent_name ?? null,
    event_date: e.event_date ?? e.created_at,
    agent: undefined,
  }))
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
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteProperty() {
    if (!confirm('Eliminare questo immobile dalla banca dati? L\'operazione non è reversibile.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore eliminazione')
      }
      toast.success('Immobile eliminato dalla banca dati')
      router.push('/banca-dati')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setDeleting(false)
    }
  }

  // Incarico dialog
  const [incaricoOpen, setIncaricoOpen] = useState(false)
  const [incaricoType, setIncaricoType] = useState<string>('esclusivo')
  const [incaricoDate, setIncaricoDate] = useState('')
  const [incaricoExpiry, setIncaricoExpiry] = useState('')
  const [incaricoCommission, setIncaricoCommission] = useState('')
  const [incaricoNotes, setIncaricoNotes] = useState('')

  // Locato dialog
  const [locatoOpen, setLocatoOpen] = useState(false)
  const [leaseType, setLeaseType] = useState<string>('4_plus_4')
  const [leaseStart, setLeaseStart] = useState('')
  const [leaseEnd, setLeaseEnd] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [deposit, setDeposit] = useState('')
  const [leaseNotes, setLeaseNotes] = useState('')

  // Edit details dialog
  const [editDetailsOpen, setEditDetailsOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    property_type: property.property_type ?? '',
    transaction_type: property.transaction_type ?? '',
    sqm: property.sqm ? String(property.sqm) : '',
    rooms: property.rooms ? String(property.rooms) : '',
    bathrooms: property.bathrooms ? String(property.bathrooms) : '',
    floor: property.floor != null ? String(property.floor) : '',
    total_floors: property.total_floors ? String(property.total_floors) : '',
    condition: property.condition ?? '',
    estimated_value: property.estimated_value ? String(property.estimated_value) : '',
    doorbell: property.doorbell ?? '',
    building_notes: property.building_notes ?? '',
  })
  const [savingDetails, setSavingDetails] = useState(false)

  async function handleSaveDetails() {
    setSavingDetails(true)
    try {
      const payload: Record<string, unknown> = {
        property_type: editForm.property_type || null,
        transaction_type: editForm.transaction_type || null,
        sqm: editForm.sqm ? parseInt(editForm.sqm, 10) : null,
        rooms: editForm.rooms ? parseInt(editForm.rooms, 10) : null,
        bathrooms: editForm.bathrooms ? parseInt(editForm.bathrooms, 10) : null,
        floor: editForm.floor !== '' ? parseInt(editForm.floor, 10) : null,
        total_floors: editForm.total_floors ? parseInt(editForm.total_floors, 10) : null,
        condition: editForm.condition || null,
        estimated_value: editForm.estimated_value ? parseInt(editForm.estimated_value, 10) : null,
        doorbell: editForm.doorbell.trim() || null,
        building_notes: editForm.building_notes.trim() || null,
      }
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore salvataggio')
      }
      const { property: updated } = await res.json()
      setProperty(updated)
      setEditDetailsOpen(false)
      toast.success('Dettagli aggiornati')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSavingDetails(false)
    }
  }

  // Disposition change
  const [changingDisposition, setChangingDisposition] = useState(false)

  async function handleChangeDisposition(newDisposition: string) {
    if (newDisposition === property.owner_disposition) return
    setChangingDisposition(true)
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_disposition: newDisposition }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore aggiornamento')
      }
      const { property: updated } = await res.json()
      setProperty(updated)
      toast.success('Stato proprietario aggiornato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setChangingDisposition(false)
    }
  }

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Add contact dialog
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactRole, setContactRole] = useState('altro')
  const [contactNotes, setContactNotes] = useState('')
  const [contactResults, setContactResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)
  const [addingContact, setAddingContact] = useState(false)

  const canAdvance = isAdmin || isOwner
  // For incarico stage, next step depends on transaction_type: affitto → locato, else → venduto
  const nextStage: PropertyStage | null = property.stage === 'incarico'
    ? (property.transaction_type === 'affitto' ? 'locato' : 'venduto')
    : STAGE_ADVANCES[property.stage as PropertyStage]
  const config = STAGE_CONFIG[property.stage as PropertyStage]

  function handleAdvanceStageClick() {
    if (!nextStage) return
    if (nextStage === 'incarico') { setIncaricoOpen(true); return }
    if (nextStage === 'locato') { setLocatoOpen(true); return }
    doAdvanceStage(nextStage)
  }

  async function doAdvanceStage(targetStage: string, extraPayload?: Record<string, unknown>) {
    setAdvancing(true)
    try {
      // If extra data needed, PATCH first
      if (extraPayload && Object.keys(extraPayload).length > 0) {
        const patchRes = await fetch(`/api/properties/${property.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraPayload),
        })
        if (!patchRes.ok) {
          const data = await patchRes.json().catch(() => ({ error: 'Errore sconosciuto' }))
          throw new Error(data.error || 'Errore aggiornamento dati')
        }
      }
      const res = await fetch(`/api/properties/${property.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_stage: targetStage }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { property: updated } = await res.json()
      setProperty(updated)
      toast.success(`Stage aggiornato a: ${STAGE_CONFIG[targetStage as PropertyStage]?.label}`)
      const evRes = await fetch(`/api/properties/${property.id}/events`)
      if (evRes.ok) {
        const evData = await evRes.json()
        setEvents(normalizeEvents(evData.events ?? []))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAdvancing(false)
    }
  }

  async function handleConfirmIncarico() {
    if (!incaricoDate || !incaricoCommission) {
      toast.error('Data e provvigione sono obbligatorie')
      return
    }
    const commission = parseFloat(incaricoCommission)
    if (isNaN(commission) || commission <= 0 || commission > 20) {
      toast.error('Provvigione deve essere tra 0% e 20%')
      return
    }
    setIncaricoOpen(false)
    await doAdvanceStage('incarico', {
      incarico_type: incaricoType,
      incarico_date: incaricoDate,
      incarico_expiry: incaricoExpiry || null,
      incarico_commission_percent: commission,
      incarico_notes: incaricoNotes || null,
    })
  }

  async function handleConfirmLocato() {
    if (!leaseType || !leaseStart || !leaseEnd || !monthlyRent) {
      toast.error('Tipo contratto, date e canone sono obbligatori')
      return
    }
    const rent = parseInt(monthlyRent, 10)
    if (isNaN(rent) || rent <= 0) {
      toast.error('Canone mensile deve essere > 0')
      return
    }
    if (leaseEnd <= leaseStart) {
      toast.error('La data di fine deve essere successiva alla data di inizio')
      return
    }
    setLocatoOpen(false)
    await doAdvanceStage('locato', {
      lease_type: leaseType,
      lease_start_date: leaseStart,
      lease_end_date: leaseEnd,
      monthly_rent: rent,
      deposit: deposit ? parseInt(deposit, 10) : null,
      lease_notes: leaseNotes || null,
    })
  }

  async function handleDownloadIncaricoPdf() {
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/properties/${property.id}/incarico-pdf`)
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(error)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incarico-${property.address.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore generazione PDF')
    } finally {
      setGeneratingPdf(false)
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
        setContacts(Array.isArray(cData.contacts) ? cData.contacts : [])
      } else {
        toast.error('Contatto aggiunto ma impossibile ricaricare la lista')
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore rimozione contatto')
      }
      setContacts((prev) => prev.filter((c) => c.id !== linkId))
      toast.success('Contatto rimosso')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella rimozione')
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
      setEvents(normalizeEvents(data.events ?? []))
    }
  }, [property.id])

  const lastEvent = events[0] ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/banca-dati" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'mt-0.5')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{property.address}</h1>
            <PropertyStageBadge stage={property.stage} />
            {/* Disposition — clickable to change */}
            <Select
              value={property.owner_disposition}
              onValueChange={handleChangeDisposition}
              disabled={changingDisposition}
            >
              <SelectTrigger className="h-7 w-auto gap-1.5 border-transparent bg-transparent px-2 hover:bg-muted/60 focus:ring-0 text-xs font-medium [&>svg]:opacity-50">
                <DispositionIcon disposition={property.owner_disposition as OwnerDisposition} showLabel />
              </SelectTrigger>
              <SelectContent align="start">
                {Object.entries(DISPOSITION_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    <span className={cn('inline-flex items-center gap-1.5', cfg.color)}>
                      <span>{cfg.symbol}</span>
                      <span className="text-foreground">{cfg.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{property.city}{property.zone ? ` · ${property.zone}` : ''}{property.sub_zone ? ` / ${property.sub_zone}` : ''}</span>
          </div>
        </div>

        {/* Primary action */}
        <div className="flex gap-2 shrink-0">
          {canAdvance && nextStage && (() => {
            // Compute blocking reason for the next stage
            let blockReason: string | null = null
            if (nextStage === 'conosciuto' && !property.owner_contact_id) {
              blockReason = 'Aggiungi prima il proprietario (sezione "Contatti immobile")'
            }
            return (
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={handleAdvanceStageClick}
                  disabled={advancing || !!blockReason}
                  size="sm"
                  title={blockReason ?? undefined}
                >
                  {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {ADVANCE_LABELS[nextStage] ?? `→ ${nextStage}`}
                </Button>
                {blockReason && (
                  <p className="text-[10px] text-muted-foreground text-right max-w-[200px] leading-tight">{blockReason}</p>
                )}
              </div>
            )
          })()}
          {/* Delete — only for early-stage properties */}
          {(property.stage === 'sconosciuto' || property.stage === 'ignoto') && (isAdmin || isOwner) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteProperty}
              disabled={deleting}
              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              title="Elimina immobile"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
          {property.stage === 'incarico' && !property.listing_id && (
            <Button variant="outline" size="sm" onClick={handlePromoteToListing}>
              <Megaphone className="h-4 w-4 mr-1.5" />
              Crea annuncio
            </Button>
          )}
          {property.listing_id && (
            <Link href={`/listing/${property.listing_id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Vedi annuncio
            </Link>
          )}
        </div>
      </div>

      {/* Sticky summary bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center gap-3 flex-wrap">
        <PropertyStageBadge stage={property.stage} />
        {property.estimated_value && (
          <span className="text-sm font-semibold">€{property.estimated_value.toLocaleString('it-IT')}</span>
        )}
        {property.owner_contact && (
          <span className="text-sm text-muted-foreground">{property.owner_contact.name}</span>
        )}
        {lastEvent && (
          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
            Ultimo evento: {new Date(lastEvent.event_date ?? lastEvent.created_at).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>

      {/* Main layout: 2 columns — timeline left, details right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* Left column — cronistoria */}
        <div>
          <Card className="p-4 h-fit">
            <h2 className="font-semibold text-sm mb-3">Cronistoria</h2>
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <EventTimeline
                propertyId={property.id}
                events={events}
                onEventAdded={reloadEvents}
              />
            </div>
          </Card>
        </div>

        {/* Right column — property data */}
        <div className="space-y-4">

          {/* Details card */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Dettagli immobile</h2>
              {(isAdmin || isOwner) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEditForm({
                      property_type: property.property_type ?? '',
                      transaction_type: property.transaction_type ?? '',
                      sqm: property.sqm ? String(property.sqm) : '',
                      rooms: property.rooms ? String(property.rooms) : '',
                      bathrooms: property.bathrooms ? String(property.bathrooms) : '',
                      floor: property.floor != null ? String(property.floor) : '',
                      total_floors: property.total_floors ? String(property.total_floors) : '',
                      condition: property.condition ?? '',
                      estimated_value: property.estimated_value ? String(property.estimated_value) : '',
                      doorbell: property.doorbell ?? '',
                      building_notes: property.building_notes ?? '',
                    })
                    setEditDetailsOpen(true)
                  }}
                  title="Modifica dettagli"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {property.property_type && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{PROPERTY_TYPE_IT[property.property_type] ?? property.property_type}</span></div>}
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
                      <a href={`tel:${property.owner_contact.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        <Phone className="h-3 w-3" />
                        {property.owner_contact.phone}
                      </a>
                    )}
                  </div>
                </div>
                <Link href={`/contacts/${property.owner_contact.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
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
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {pc.contact?.id ? (
                        <Link href={`/contacts/${pc.contact.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                            {pc.contact.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate underline-offset-2 hover:underline">{pc.contact.name ?? 'Sconosciuto'}</p>
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[pc.role] ?? pc.role}</p>
                          </div>
                        </Link>
                      ) : (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                            {pc.contact?.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{pc.contact?.name ?? 'Sconosciuto'}</p>
                            <p className="text-xs text-muted-foreground">{ROLE_LABELS[pc.role] ?? pc.role}</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {pc.contact?.phone && (
                        <a href={`tel:${pc.contact.phone}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}>
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                      {pc.contact?.id && (
                        <Link href={`/contacts/${pc.contact.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
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
          {property.stage === 'incarico' && (() => {
            const expiryDate = property.incarico_expiry ? new Date(property.incarico_expiry) : null
            const now = new Date()
            const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
            const isExpired = daysToExpiry !== null && daysToExpiry < 0
            const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30

            return (
              <Card className={cn('p-5 space-y-3', isExpired ? 'border-destructive/40' : isExpiringSoon ? 'border-amber-400/40' : '')}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-sm">Incarico</h2>
                    {isExpired && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        Scaduto
                      </span>
                    )}
                    {isExpiringSoon && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        Scade tra {daysToExpiry}g
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={handleDownloadIncaricoPdf}
                    disabled={generatingPdf}
                  >
                    {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
                    Genera contratto
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {property.incarico_type && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{property.incarico_type}</span></div>}
                  {property.incarico_date && <div><span className="text-muted-foreground">Data firma:</span> <span className="font-medium">{new Date(property.incarico_date).toLocaleDateString('it-IT')}</span></div>}
                  {property.incarico_expiry && (
                    <div>
                      <span className="text-muted-foreground">Scadenza:</span>{' '}
                      <span className={cn('font-medium', isExpired ? 'text-destructive' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : '')}>
                        {new Date(property.incarico_expiry).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  )}
                  {property.incarico_commission_percent && <div><span className="text-muted-foreground">Provvigione:</span> <span className="font-medium">{property.incarico_commission_percent}%</span></div>}
                  {property.incarico_notes && <div className="col-span-2"><span className="text-muted-foreground">Note:</span> <span>{property.incarico_notes}</span></div>}
                </div>
              </Card>
            )
          })()}

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
              {property.lease_notes && (
                <p className="text-sm text-muted-foreground">{property.lease_notes}</p>
              )}
              {property.tenant_contact && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Inquilino</p>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                        {property.tenant_contact.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{property.tenant_contact.name}</p>
                        {property.tenant_contact.phone && (
                          <a href={`tel:${property.tenant_contact.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            <Phone className="h-3 w-3" />
                            {property.tenant_contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <Link href={`/contacts/${property.tenant_contact.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 shrink-0')}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* AI Match Engine */}
          <AiMatchPanel propertyId={property.id} />

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

      {/* Edit details dialog */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica dettagli immobile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo immobile</Label>
                <Select value={editForm.property_type || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, property_type: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Non specificato —</SelectItem>
                    <SelectItem value="apartment">Appartamento</SelectItem>
                    <SelectItem value="house">Casa</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="commercial">Commerciale</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="garage">Garage</SelectItem>
                    <SelectItem value="other">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo operazione</Label>
                <Select value={editForm.transaction_type || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, transaction_type: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Non specificato —</SelectItem>
                    <SelectItem value="vendita">Vendita</SelectItem>
                    <SelectItem value="affitto">Affitto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Superficie (mq)</Label>
                <Input type="number" min="0" value={editForm.sqm} onChange={(e) => setEditForm(f => ({ ...f, sqm: e.target.value }))} placeholder="Es. 85" />
              </div>
              <div className="space-y-1.5">
                <Label>Locali</Label>
                <Input type="number" min="0" value={editForm.rooms} onChange={(e) => setEditForm(f => ({ ...f, rooms: e.target.value }))} placeholder="Es. 3" />
              </div>
              <div className="space-y-1.5">
                <Label>Bagni</Label>
                <Input type="number" min="0" value={editForm.bathrooms} onChange={(e) => setEditForm(f => ({ ...f, bathrooms: e.target.value }))} placeholder="Es. 1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Piano</Label>
                <Input type="number" value={editForm.floor} onChange={(e) => setEditForm(f => ({ ...f, floor: e.target.value }))} placeholder="Es. 2" />
              </div>
              <div className="space-y-1.5">
                <Label>Piani totali</Label>
                <Input type="number" min="1" value={editForm.total_floors} onChange={(e) => setEditForm(f => ({ ...f, total_floors: e.target.value }))} placeholder="Es. 4" />
              </div>
              <div className="space-y-1.5">
                <Label>Condizioni</Label>
                <Select value={editForm.condition || 'none'} onValueChange={(v) => setEditForm(f => ({ ...f, condition: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— —</SelectItem>
                    <SelectItem value="nuovo">Nuovo</SelectItem>
                    <SelectItem value="ottimo">Ottimo</SelectItem>
                    <SelectItem value="buono">Buono</SelectItem>
                    <SelectItem value="da_ristrutturare">Da ristrutturare</SelectItem>
                    <SelectItem value="in_costruzione">In costruzione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valutazione (€)</Label>
                <Input type="number" min="0" value={editForm.estimated_value} onChange={(e) => setEditForm(f => ({ ...f, estimated_value: e.target.value }))} placeholder="Es. 180000" />
              </div>
              <div className="space-y-1.5">
                <Label>Campanello</Label>
                <Input value={editForm.doorbell} onChange={(e) => setEditForm(f => ({ ...f, doorbell: e.target.value }))} placeholder="Es. Rossi / Int. 4" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note palazzo</Label>
              <Textarea value={editForm.building_notes} onChange={(e) => setEditForm(f => ({ ...f, building_notes: e.target.value }))} rows={2} placeholder="Es. Palazzo anni '60, 4 piani, no ascensore..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsOpen(false)} disabled={savingDetails}>Annulla</Button>
            <Button onClick={handleSaveDetails} disabled={savingDetails}>
              {savingDetails ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incarico dialog */}
      <Dialog open={incaricoOpen} onOpenChange={setIncaricoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avvia Incarico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tipo incarico *</Label>
              <Select value={incaricoType} onValueChange={(v) => setIncaricoType(v ?? 'esclusivo')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="esclusivo">Esclusivo</SelectItem>
                  <SelectItem value="non_esclusivo">Non esclusivo</SelectItem>
                  <SelectItem value="mediazione">Mediazione</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data firma *</Label>
                <Input type="date" value={incaricoDate} onChange={(e) => setIncaricoDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Scadenza incarico</Label>
                <Input type="date" value={incaricoExpiry} onChange={(e) => setIncaricoExpiry(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Provvigione (%) *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={incaricoCommission}
                onChange={(e) => setIncaricoCommission(e.target.value)}
                placeholder="Es. 3"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note incarico</Label>
              <Textarea
                value={incaricoNotes}
                onChange={(e) => setIncaricoNotes(e.target.value)}
                placeholder="Condizioni particolari, accordi..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncaricoOpen(false)}>Annulla</Button>
            <Button onClick={handleConfirmIncarico} disabled={advancing}>
              {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Conferma incarico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Locato dialog */}
      <Dialog open={locatoOpen} onOpenChange={setLocatoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registra Locazione</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tipo contratto *</Label>
              <Select value={leaseType} onValueChange={(v) => setLeaseType(v ?? '4_plus_4')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4_plus_4">4+4</SelectItem>
                  <SelectItem value="3_plus_2">3+2</SelectItem>
                  <SelectItem value="transitorio">Transitorio</SelectItem>
                  <SelectItem value="foresteria">Foresteria</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data inizio *</Label>
                <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fine *</Label>
                <Input type="date" value={leaseEnd} onChange={(e) => setLeaseEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Canone mensile (€) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  placeholder="Es. 800"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Deposito cauzionale (€)</Label>
                <Input
                  type="number"
                  min="0"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="Es. 2400"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note locazione</Label>
              <Textarea
                value={leaseNotes}
                onChange={(e) => setLeaseNotes(e.target.value)}
                placeholder="Condizioni particolari, clausole..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocatoOpen(false)}>Annulla</Button>
            <Button onClick={handleConfirmLocato} disabled={advancing}>
              {advancing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Registra locazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
