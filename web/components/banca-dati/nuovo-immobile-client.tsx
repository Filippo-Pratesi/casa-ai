'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Building2, User } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddressAutocomplete } from './address-autocomplete'
import { CityAutocomplete } from './city-autocomplete'
import { ZoneSelector } from './zone-selector'
import { PropertyCard } from './property-card'
import { toast } from 'sonner'

interface NearbyProperty {
  id: string
  address: string
  city: string
  zone: string | null
  sub_zone: string | null
  stage: string
  owner_disposition: string
  transaction_type: string | null
  owner_name?: string | null
  updated_at: string
}

interface NearbyResult {
  same_building: NearbyProperty[]
  nearby: NearbyProperty[]
}

interface NuovoImmobileClientProps {
  agentDefaultZones: { name: string; city: string }[]
  agents?: { id: string; name: string }[]
  isAdmin?: boolean
  currentUserId?: string
}

export function NuovoImmobileClient({ agentDefaultZones, agents = [], isAdmin = false, currentUserId }: NuovoImmobileClientProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentUserId ?? '')

  // Address is split into street (from autocomplete) + civico (house number)
  // Coordinates are resolved only after both street and civico are set.
  const [street, setStreet] = useState('')
  const [civico, setCivico] = useState('')
  const [city, setCity] = useState('')
  const [cityProximity, setCityProximity] = useState<string | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [zone, setZone] = useState('')
  const [subZone, setSubZone] = useState('')
  const [doorbell, setDoorbell] = useState('')
  const [buildingNotes, setBuildingNotes] = useState('')
  const [initialNote, setInitialNote] = useState('')

  // Contact linking
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string } | null>(null)
  const [contactRole, setContactRole] = useState('proprietario')
  const [searchingContacts, setSearchingContacts] = useState(false)

  const [transactionType, setTransactionType] = useState('')
  const [propertyType, setPropertyType] = useState('')

  const [nearby, setNearby] = useState<NearbyResult | null>(null)
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [geocodingCivico, setGeocodingCivico] = useState(false)

  const civicGeoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-set zone from agent defaults when city changes
  useEffect(() => {
    if (city && !zone) {
      const defaultZone = agentDefaultZones.find((z) => z.city.toLowerCase() === city.toLowerCase())
      if (defaultZone) setZone(defaultZone.name)
    }
  }, [city, zone, agentDefaultZones])

  // When street or civico change: geocode the full address to get precise coordinates.
  // Coordinates are only fetched when BOTH street and civico are non-empty,
  // ensuring the nearby search uses a building-level point (not a street centroid).
  useEffect(() => {
    if (civicGeoDebounceRef.current) clearTimeout(civicGeoDebounceRef.current)

    if (!street.trim() || !civico.trim()) {
      // No precise address yet — clear coordinates
      setLatitude(null)
      setLongitude(null)
      return
    }

    civicGeoDebounceRef.current = setTimeout(async () => {
      setGeocodingCivico(true)
      try {
        const q = `${street.trim()} ${civico.trim()}`
        const url = `/api/geocode?q=${encodeURIComponent(q)}&country=it${cityProximity ? `&proximity=${cityProximity}` : ''}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const first = data.suggestions?.[0]
        if (first?.latitude && first?.longitude) {
          setLatitude(first.latitude)
          setLongitude(first.longitude)
        }
      } catch { /* non-fatal */ } finally {
        setGeocodingCivico(false)
      }
    }, 500)

    return () => { if (civicGeoDebounceRef.current) clearTimeout(civicGeoDebounceRef.current) }
  }, [street, civico, cityProximity])

  // Load nearby when precise coordinates are available (requires both street + civico)
  useEffect(() => {
    if (!latitude || !longitude) {
      setNearby(null)
      return
    }
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    setLoadingNearby(true)
    fetch(`/api/properties/nearby?lat=${latitude}&lng=${longitude}&radius=100`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: unknown) => {
        // Guard against error responses — only update state if response has expected shape
        const typed = data as Partial<NearbyResult>
        if (typed && Array.isArray(typed.same_building) && Array.isArray(typed.nearby)) {
          setNearby(typed as NearbyResult)
        }
      })
      .catch((err) => { if (err?.name !== 'AbortError') console.error('Nearby fetch failed:', err) })
      .finally(() => { clearTimeout(timeoutId); setLoadingNearby(false) })
    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [latitude, longitude])

  function handleAddressSelect(suggestion: { address: string; city: string; latitude: number; longitude: number }) {
    // Set the street name only — coordinates are resolved when the civic number is entered.
    setStreet(suggestion.address)
    // Auto-fill city from Mapbox if not already set by CityAutocomplete
    if (!city && suggestion.city) {
      setCity(suggestion.city)
    }
    // Clear any previously resolved coordinates until civic is entered
    setLatitude(null)
    setLongitude(null)
  }

  async function searchContacts(q: string) {
    setContactSearch(q)
    setSelectedContact(null)
    if (q.length < 2) { setContactResults([]); return }
    setSearchingContacts(true)
    try {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(q)}&limit=8`)
      if (res.ok) {
        const data = await res.json()
        setContactResults((data.contacts ?? []).slice(0, 8))
      }
    } finally {
      setSearchingContacts(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!street.trim()) { toast.error('L\'indirizzo è obbligatorio'); return }
    if (!city.trim()) { toast.error('La città è obbligatoria'); return }
    if (!zone.trim()) { toast.error('La zona è obbligatoria'); return }

    // Combined address for storage
    const address = civico.trim() ? `${street.trim()} ${civico.trim()}` : street.trim()

    setSubmitting(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address, city: city.trim(), zone: zone.trim(),
          sub_zone: subZone.trim() || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          doorbell: doorbell.trim() || null,
          building_notes: buildingNotes.trim() || null,
          initial_note: initialNote.trim() || null,
          transaction_type: transactionType || null,
          property_type: propertyType || null,
          agent_id: selectedAgentId || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { id } = await res.json()

      // Link contact if selected
      if (selectedContact) {
        try {
          await fetch(`/api/properties/${id}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact_id: selectedContact.id, role: contactRole }),
          })
          // If proprietario: patch owner_contact_id then advance to conosciuto
          if (contactRole === 'proprietario') {
            await fetch(`/api/properties/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ owner_contact_id: selectedContact.id }),
            })
            await fetch(`/api/properties/${id}/advance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target_stage: 'conosciuto' }),
            })
          } else {
            // Any other contact: advance to ignoto
            await fetch(`/api/properties/${id}/advance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ target_stage: 'ignoto' }),
            })
          }
        } catch { /* non-fatal: property still created */ }
      }

      toast.success('Immobile aggiunto alla banca dati')
      router.push(`/banca-dati/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const hasNearby = nearby && (nearby.same_building.length > 0 || nearby.nearby.length > 0)
  const hasPreciseAddress = !!(street.trim() && civico.trim())

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/banca-dati" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nuovo Immobile</h1>
          <p className="text-sm text-muted-foreground">Aggiungi un immobile alla banca dati</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location section */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Localizzazione</h2>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label>Città *</Label>
            <CityAutocomplete
              value={city}
              onChange={setCity}
              onSelect={(s) => {
                setCity(s.city)
                setCityProximity(`${s.longitude},${s.latitude}`)
                // Reset zone if city changed
                setZone('')
              }}
            />
          </div>

          {/* Street + Civic number on the same row */}
          <div className="space-y-1.5">
            <Label>Via / Indirizzo *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <AddressAutocomplete
                  value={street}
                  onChange={setStreet}
                  onSelect={handleAddressSelect}
                  placeholder="Via Roma, Viale Mazzini…"
                  proximity={cityProximity ?? undefined}
                />
              </div>
              <div className="w-24 shrink-0">
                <Input
                  value={civico}
                  onChange={(e) => setCivico(e.target.value)}
                  placeholder="N° civico"
                  aria-label="Numero civico"
                />
              </div>
            </div>

            {/* Coordinate status */}
            {!hasPreciseAddress && street.trim() && (
              <p className="text-xs text-muted-foreground">
                Inserisci il numero civico per ottenere le coordinate precise e cercare immobili vicini.
              </p>
            )}
            {hasPreciseAddress && geocodingCivico && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Ricerca coordinate…
              </p>
            )}
            {hasPreciseAddress && !geocodingCivico && latitude && longitude && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Coordinate acquisite ({latitude.toFixed(5)}, {longitude.toFixed(5)})
              </p>
            )}
            {hasPreciseAddress && !geocodingCivico && !latitude && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Coordinate non trovate — l&apos;immobile verrà salvato senza posizione.
              </p>
            )}
          </div>

          {/* Zone */}
          <div className="space-y-1.5">
            <Label>Zona *</Label>
            <ZoneSelector
              city={city}
              value={zone}
              subZoneValue={subZone}
              onChange={setZone}
              onSubZoneChange={setSubZone}
              disabled={!city}
            />
          </div>

          {/* Doorbell */}
          <div className="space-y-1.5">
            <Label>Campanello / Interno</Label>
            <Input
              value={doorbell}
              onChange={(e) => setDoorbell(e.target.value)}
              placeholder="Es. Rossi, Int. 5, Sc. B..."
            />
          </div>

          {/* Building notes */}
          <div className="space-y-1.5">
            <Label>Note palazzo</Label>
            <Textarea
              value={buildingNotes}
              onChange={(e) => setBuildingNotes(e.target.value)}
              placeholder="Dettagli sul palazzo, accesso, portineria..."
              rows={2}
            />
          </div>

          {/* Transaction type + property type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo operazione</Label>
              <Select value={transactionType || 'none'} onValueChange={(v) => setTransactionType(!v || v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Non specificato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non specificato</SelectItem>
                  <SelectItem value="vendita">Vendita</SelectItem>
                  <SelectItem value="affitto">Affitto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo immobile</Label>
              <Select value={propertyType || 'none'} onValueChange={(v) => setPropertyType(!v || v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Non specificato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non specificato</SelectItem>
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
          </div>
          {/* Agent selector (admin only) */}
          {isAdmin && agents.length > 1 && (
            <div className="space-y-1.5">
              <Label>Agente assegnato</Label>
              <Select value={selectedAgentId || 'none'} onValueChange={(v) => setSelectedAgentId(!v || v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Nearby properties — shown only when precise coordinates are available */}
        {(loadingNearby || hasNearby) && (
          <Card className="p-5 space-y-3">
            <h2 className="font-semibold text-sm">Immobili già noti nelle vicinanze</h2>
            {loadingNearby ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cercando immobili vicini...
              </div>
            ) : (
              <>
                {(nearby?.same_building ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stesso edificio</p>
                    <div className="grid gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(nearby?.same_building ?? []).map((p: any) => (
                        <PropertyCard key={p.id} property={p} compact />
                      ))}
                    </div>
                  </div>
                )}
                {(nearby?.nearby ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entro 100 metri</p>
                    <div className="grid gap-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(nearby?.nearby ?? []).map((p: any) => (
                        <PropertyCard key={p.id} property={p} compact />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* Optional initial note */}
        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Prima nota (opzionale)</h2>
          <Textarea
            value={initialNote}
            onChange={(e) => setInitialNote(e.target.value)}
            placeholder="Come hai scoperto questo immobile? Note iniziali..."
            rows={3}
          />
        </Card>

        {/* Contact linking */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Contatto collegato <span className="text-muted-foreground font-normal">(opzionale)</span></h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Aggiungere un proprietario avanzerà automaticamente lo stage a Conosciuto.</p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cerca contatto</Label>
              <div className="relative">
                <Input
                  placeholder="Nome, telefono..."
                  value={contactSearch}
                  onChange={(e) => searchContacts(e.target.value)}
                  autoComplete="off"
                />
                {searchingContacts && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>
              {contactResults.length > 0 && !selectedContact && (
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
                <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2">
                  <p className="text-sm text-green-700 dark:text-green-400">✓ {selectedContact.name}</p>
                  <button
                    type="button"
                    onClick={() => { setSelectedContact(null); setContactSearch('') }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Rimuovi
                  </button>
                </div>
              )}
            </div>

            {selectedContact && (
              <div className="space-y-1.5">
                <Label>Ruolo nell&apos;immobile</Label>
                <Select value={contactRole} onValueChange={(v) => setContactRole(v ?? 'proprietario')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprietario">Proprietario</SelectItem>
                    <SelectItem value="moglie_marito">Moglie/Marito</SelectItem>
                    <SelectItem value="figlio_figlia">Figlio/Figlia</SelectItem>
                    <SelectItem value="vicino">Vicino</SelectItem>
                    <SelectItem value="portiere">Portiere</SelectItem>
                    <SelectItem value="amministratore">Amministratore</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/banca-dati" className={buttonVariants({ variant: 'outline' })}>
            Annulla
          </Link>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvataggio...</>
            ) : (
              'Aggiungi alla banca dati'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
