'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, MapPin, Phone, ExternalLink,
  Plus, Trash2, Loader2, Megaphone, FileDown, Pencil, AlertTriangle, MoreHorizontal
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PropertyStageIcon, type PropertyStage, STAGE_CONFIG } from './property-stage-icon'
import { ContactTypeBadges } from '@/components/contacts/contact-type-badges'
import { DispositionIcon, DISPOSITION_CONFIG, type OwnerDisposition } from './disposition-icon'
import { type PropertyEvent } from './event-timeline'
import { PropertyCronistoriaPanel, type ListingNoteEntry } from './property-cronistoria-panel'
import { PropertyCard } from './property-card'
import { AiMatchPanel } from './ai-match-panel'
import { CadastralPanel } from './cadastral-panel'
import { EditDetailsDialog } from './edit-details-dialog'
import { AddContactDialog } from './add-contact-dialog'
import { IncaricoDialog } from './incarico-dialog'
import { LocatoDialog } from './locato-dialog'
import { PROPERTY_ROLE_LABELS } from '@/lib/property-role-labels'

const ROLE_LABELS = PROPERTY_ROLE_LABELS

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
  locato: 'conosciuto',  // lease ended → back to active management
}

const ADVANCE_LABELS: Record<string, string> = {
  ignoto: 'Segna come Non contattato',
  conosciuto: 'Segna come Conosciuto',
  incarico: 'Avvia Incarico',
  venduto: 'Segna come Venduto',
  locato: 'Segna come Locato',
}

interface PropertyContact {
  id: string
  role: string
  is_primary: boolean
  notes: string | null
  contact: { id: string; name: string; phone: string | null; email: string | null; type?: string | null; types?: string[] | null } | null
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
  omiZoneCode?: string | null
  initialListingNotes?: ListingNoteEntry[]
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
  omiZoneCode,
  initialListingNotes = [],
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

  // Locato dialog
  const [locatoOpen, setLocatoOpen] = useState(false)

  // Edit details dialog
  const [editDetailsOpen, setEditDetailsOpen] = useState(false)

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

  async function handleStageChange(newStage: string) {
    if (newStage === property.stage) return
    if (newStage === 'incarico') { setIncaricoOpen(true); return }
    if (newStage === 'locato') { setLocatoOpen(true); return }
    doAdvanceStage(newStage)
  }

  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Add contact dialog
  const [addContactOpen, setAddContactOpen] = useState(false)

  // First-contact stage prompt state
  const [stagePrompt, setStagePrompt] = useState<{ contactName: string } | null>(null)
  const [advancingFromPrompt, setAdvancingFromPrompt] = useState(false)

  async function handleFirstContactStageChoice(wasContacted: boolean) {
    setAdvancingFromPrompt(true)
    const targetStage = wasContacted ? 'conosciuto' : 'ignoto'
    try {
      // For 'ignoto', we need at least one detail; for 'conosciuto', owner_contact_id must be set.
      // Both conditions should be met by this point. Use force=true to bypass strict validation.
      const res = await fetch(`/api/properties/${property.id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_stage: targetStage, force: true }),
      })
      if (res.ok) {
        const { property: updated } = await res.json()
        setProperty(updated)
        toast.success(wasContacted ? 'Stato aggiornato: Contattato' : 'Stato aggiornato: Non contattato')
        await reloadEvents()
      }
    } catch {
      // non-blocking
    } finally {
      setAdvancingFromPrompt(false)
      setStagePrompt(null)
    }
  }

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

  async function handleRemoveContact(linkId: string) {
    try {
      const res = await fetch(`/api/properties/${property.id}/contacts/${linkId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error || 'Errore rimozione contatto')
      }
      setContacts((prev) => prev.filter((c) => c.id !== linkId))
      toast.success('Contatto rimosso')
      await reloadEvents()
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
            {/* Stage — clickable to change */}
            <Select
              value={property.stage}
              onValueChange={handleStageChange}
              disabled={advancing}
            >
              <SelectTrigger className="h-7 w-auto gap-1.5 border-transparent bg-transparent px-2 hover:bg-muted/60 focus:ring-0 text-xs font-medium [&>svg]:opacity-50">
                <PropertyStageIcon stage={property.stage as PropertyStage} showLabel size="sm" />
              </SelectTrigger>
              <SelectContent align="start">
                {(Object.entries(STAGE_CONFIG) as [PropertyStage, (typeof STAGE_CONFIG)[PropertyStage]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <SelectItem key={key} value={key}>
                      <span className={cn('inline-flex items-center gap-1.5', cfg.color)}>
                        <Icon className="h-3 w-3" />
                        <span className="text-foreground">{cfg.label}</span>
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
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
            {property.estimated_value && (
              <span className="text-sm font-bold">€{property.estimated_value.toLocaleString('it-IT')}</span>
            )}
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
          {/* Desktop secondary actions */}
          <div className="hidden md:flex gap-2">
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
            {property.listing_id && (
              <Link
                href={`/campaigns/new?listing_id=${property.listing_id}&property_id=${property.id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Megaphone className="h-4 w-4 mr-1.5" />
                Crea Campagna
              </Link>
            )}
          </div>
          {/* Mobile overflow menu */}
          {(property.listing_id || (property.stage === 'incarico' && !property.listing_id)) && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {property.stage === 'incarico' && !property.listing_id && (
                    <DropdownMenuItem onClick={handlePromoteToListing}>
                      <Megaphone className="h-4 w-4 mr-2" />
                      Crea annuncio
                    </DropdownMenuItem>
                  )}
                  {property.listing_id && (
                    <DropdownMenuItem onClick={() => router.push(`/listing/${property.listing_id}`)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Vedi annuncio
                    </DropdownMenuItem>
                  )}
                  {property.listing_id && (
                    <DropdownMenuItem onClick={() => router.push(`/campaigns/new?listing_id=${property.listing_id}&property_id=${property.id}`)}>
                      <Megaphone className="h-4 w-4 mr-2" />
                      Crea Campagna
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Sticky summary bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center gap-3 flex-wrap">
        {property.owner_contact && (
          <span className="text-sm text-muted-foreground">{property.owner_contact.name}</span>
        )}
        {lastEvent && (
          <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
            Ultimo evento: {new Date(lastEvent.event_date ?? lastEvent.created_at).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>

      {/* Main layout: 2 columns — details left, timeline right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_338px] gap-6">

        {/* Column 2 (260px) — cronistoria, sticky */}
        <div className="order-2">
          <Card className="p-3 h-fit lg:sticky lg:top-4">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Cronistoria</h2>
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-0.5">
              <PropertyCronistoriaPanel
                propertyId={property.id}
                events={events}
                initialListingNotes={initialListingNotes}
                onEventAdded={reloadEvents}
              />
            </div>
          </Card>
        </div>

        {/* Column 1 (1fr) — property data */}
        <div className="space-y-4 order-1">

          {/* Details card + Owner contact — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

            {/* Details card */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Dettagli immobile</h2>
                {(isAdmin || isOwner) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditDetailsOpen(true)}
                    title="Modifica dettagli"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {property.condition && <div className="col-span-2"><span className="text-muted-foreground">Condizioni:</span> <span className="font-medium capitalize">{property.condition.replace(/_/g, ' ')}</span></div>}
                {property.property_type && <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{PROPERTY_TYPE_IT[property.property_type] ?? property.property_type}</span></div>}
                {property.sqm && <div><span className="text-muted-foreground">Superficie:</span> <span className="font-medium">{property.sqm} mq</span></div>}
                {property.rooms && <div><span className="text-muted-foreground">Locali:</span> <span className="font-medium">{property.rooms}</span></div>}
                {property.bathrooms && <div><span className="text-muted-foreground">Bagni:</span> <span className="font-medium">{property.bathrooms}</span></div>}
                {property.floor != null && <div><span className="text-muted-foreground">Piano:</span> <span className="font-medium">{property.floor}{property.total_floors ? `/${property.total_floors}` : ''}</span></div>}
                {property.estimated_value && <div className="col-span-2"><span className="text-muted-foreground">Valutazione:</span> <span className="font-medium">€{property.estimated_value.toLocaleString('it-IT')}</span></div>}
                {property.transaction_type && <div><span className="text-muted-foreground">Operazione:</span> <span className="font-medium capitalize">{property.transaction_type}</span></div>}
                {property.doorbell && <div><span className="text-muted-foreground">Campanello:</span> <span className="font-medium">{property.doorbell}</span></div>}
                {property.agent?.name && <div className="col-span-2"><span className="text-muted-foreground">Agente:</span> <span className="font-medium">{property.agent.name}</span></div>}
              </div>
              {property.building_notes && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Note palazzo: </span>
                  <span>{property.building_notes}</span>
                </div>
              )}
            </Card>

            {/* Owner contact(s) */}
            {(() => {
              const proprietari = contacts.filter(pc => pc.role === 'proprietario' && pc.contact?.id)
              if (proprietari.length === 0 && !property.owner_contact) {
                return (
                  <Card className="p-4 flex items-center justify-center text-xs text-muted-foreground min-h-[100px]">
                    Nessun proprietario associato
                  </Card>
                )
              }
              // Deduplicate by contact id
              const seen = new Set<string>()
              const uniqueProprietari = proprietari.filter(pc => {
                const cid = pc.contact!.id
                if (seen.has(cid)) return false
                seen.add(cid)
                return true
              })
              // Fallback: if no proprietari in contacts state but owner_contact exists (initial load)
              const displayList = uniqueProprietari.length > 0
                ? uniqueProprietari.map(pc => pc.contact!)
                : property.owner_contact ? [property.owner_contact] : []

              return (
                <Card className="p-4 space-y-3">
                  <h2 className="font-semibold text-sm">
                    {displayList.length > 1 ? 'Proprietari' : 'Proprietario'}
                  </h2>
                  <div className="space-y-3">
                    {displayList.map(owner => (
                      <div key={owner.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                            {owner.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-medium">{owner.name}</p>
                              <ContactTypeBadges
                                types={owner.types}
                                type={owner.type}
                                size="xs"
                              />
                            </div>
                            {owner.phone && (
                              <a href={`tel:${owner.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                <Phone className="h-3 w-3" />
                                {owner.phone}
                              </a>
                            )}
                            {owner.email && (
                              <a href={`mailto:${owner.email}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                                <span className="text-[10px]">✉</span>
                                {owner.email}
                              </a>
                            )}
                          </div>
                        </div>
                        <Link href={`/contacts/${owner.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })()}
          </div>

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
            ) : (() => {
              // Deduplicate: group by contact.id, merging roles for same person
              type GroupedContact = {
                ids: string[]
                roles: string[]
                contact: PropertyContact['contact']
              }
              const grouped: GroupedContact[] = []
              const byContactId = new Map<string, GroupedContact>()
              for (const pc of contacts) {
                const key = pc.contact?.id
                if (key) {
                  const existing = byContactId.get(key)
                  if (existing) {
                    existing.ids.push(pc.id)
                    if (!existing.roles.includes(pc.role)) existing.roles.push(pc.role)
                  } else {
                    const entry: GroupedContact = { ids: [pc.id], roles: [pc.role], contact: pc.contact }
                    byContactId.set(key, entry)
                    grouped.push(entry)
                  }
                } else {
                  grouped.push({ ids: [pc.id], roles: [pc.role], contact: pc.contact })
                }
              }

              return (
                <div className="space-y-2">
                  {grouped.map((g) => (
                    <div key={g.ids[0]} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 p-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {g.contact?.id ? (
                          <Link href={`/contacts/${g.contact.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                              {g.contact.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate underline-offset-2 hover:underline">{g.contact.name ?? 'Sconosciuto'}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {g.roles.map((role) => (
                                  <span key={role} className="text-[10px] font-medium rounded bg-muted/80 border border-border/60 px-1.5 py-0.5 text-muted-foreground">{ROLE_LABELS[role] ?? role}</span>
                                ))}
                                {g.contact.types || g.contact.type ? (
                                  <ContactTypeBadges types={g.contact.types} type={g.contact.type} size="xs" />
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold shrink-0">
                              {g.contact?.name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{g.contact?.name ?? 'Sconosciuto'}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {g.roles.map((role) => (
                                  <span key={role} className="text-[10px] font-medium rounded bg-muted/80 border border-border/60 px-1.5 py-0.5 text-muted-foreground">{ROLE_LABELS[role] ?? role}</span>
                                ))}
                                {g.contact?.types || g.contact?.type ? (
                                  <ContactTypeBadges types={g.contact?.types} type={g.contact?.type} size="xs" />
                                ) : null}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {g.contact?.phone && (
                          <a href={`tel:${g.contact.phone}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}>
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                        {g.contact?.id && (
                          <Link href={`/contacts/${g.contact.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {(isAdmin || isOwner) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={async () => { for (const id of g.ids) await handleRemoveContact(id) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
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

          {/* Dati Catastali + Stima Valore */}
          <CadastralPanel
            propertyId={property.id}
            latitude={property.latitude}
            longitude={property.longitude}
            sqm={property.sqm}
            propertyType={property.property_type}
            codiceComune={property.city ?? null}
            zonaOmi={omiZoneCode ?? null}
            existingCadastralData={property.cadastral_data ?? null}
            existingFetchedAt={property.cadastral_data_fetched_at ?? null}
            onCadastralDataFetched={async (data) => {
              await fetch('/api/catasto/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ property_id: property.id, cadastral_data: data }),
              })
            }}
          />

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

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        propertyId={property.id}
        onAdded={async ({ role, contactId, contactName }) => {
          const cRes = await fetch(`/api/properties/${property.id}/contacts`)
          if (cRes.ok) {
            const cData = await cRes.json()
            const freshContacts = Array.isArray(cData.contacts) ? cData.contacts : []
            setContacts(freshContacts)
            // If proprietario added, update owner_contact in local property state
            if (role === 'proprietario' && !property.owner_contact) {
              const ownerEntry = freshContacts.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.role === 'proprietario' && c.contact?.id === contactId
              )
              if (ownerEntry?.contact) {
                setProperty((prev: Record<string, unknown>) => ({ ...prev, owner_contact: ownerEntry.contact, owner_contact_id: contactId }))
              }
            }
          }
          await reloadEvents()
          // First-contact stage prompt: only if this is the first contact, role is proprietario, and stage is sconosciuto
          if (contacts.length === 0 && role === 'proprietario' && property.stage === 'sconosciuto') {
            setStagePrompt({ contactName })
          }
        }}
      />

      {/* First-contact stage prompt */}
      {stagePrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
            <div className="space-y-1">
              <p className="font-semibold text-sm">Hai già contattato il proprietario?</p>
              <p className="text-xs text-muted-foreground">
                {stagePrompt.contactName} è stato aggiunto come Proprietario. Aggiorna automaticamente lo stato dell&apos;immobile.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                disabled={advancingFromPrompt}
                onClick={() => handleFirstContactStageChoice(true)}
              >
                {advancingFromPrompt ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Sì, l&apos;ho contattato
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="sm"
                disabled={advancingFromPrompt}
                onClick={() => handleFirstContactStageChoice(false)}
              >
                No, non ancora
              </Button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
              onClick={() => setStagePrompt(null)}
            >
              Salta per ora
            </button>
          </div>
        </div>
      )}

      <EditDetailsDialog
        open={editDetailsOpen}
        onOpenChange={setEditDetailsOpen}
        property={property}
        onSaved={(updated) => {
          setProperty(updated as typeof property)
          setEditDetailsOpen(false)
        }}
      />

      <IncaricoDialog
        open={incaricoOpen}
        onOpenChange={setIncaricoOpen}
        advancing={advancing}
        onConfirm={(payload) => doAdvanceStage('incarico', payload)}
      />

      <LocatoDialog
        open={locatoOpen}
        onOpenChange={setLocatoOpen}
        advancing={advancing}
        onConfirm={(payload) => doAdvanceStage('locato', payload)}
      />
    </div>
  )
}
