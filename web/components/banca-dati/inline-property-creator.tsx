'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddressAutocomplete } from './address-autocomplete'
import { CityAutocomplete } from './city-autocomplete'
import { ZoneSelector } from './zone-selector'
import { toast } from 'sonner'

const FEATURES_LIST = [
  { value: 'ascensore', label: 'Ascensore' },
  { value: 'terrazzo', label: 'Terrazzo' },
  { value: 'balcone', label: 'Balcone' },
  { value: 'giardino', label: 'Giardino' },
  { value: 'garage', label: 'Garage' },
  { value: 'box', label: 'Box' },
  { value: 'cantina', label: 'Cantina' },
  { value: 'soffitta', label: 'Soffitta' },
  { value: 'piscina', label: 'Piscina' },
  { value: 'portiere', label: 'Portineria' },
  { value: 'videocitofono', label: 'Videocitofono' },
  { value: 'aria_condizionata', label: 'Aria condizionata' },
  { value: 'riscaldamento_autonomo', label: 'Risc. autonomo' },
  { value: 'doppi_vetri', label: 'Doppi vetri' },
  { value: 'taverna', label: 'Taverna' },
  { value: 'posto_auto', label: 'Posto auto' },
]

interface InlinePropertyCreatorProps {
  /** Called when the property is created successfully */
  onCreated: (property: { id: string; address: string; city: string; stage: string }) => void
  onCancel: () => void
}

export function InlinePropertyCreator({ onCreated, onCancel }: InlinePropertyCreatorProps) {
  const [street, setStreet] = useState('')
  const [civico, setCivico] = useState('')
  const [city, setCity] = useState('')
  const [cityProximity, setCityProximity] = useState<string | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [zone, setZone] = useState('')
  const [subZone, setSubZone] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [propertyType, setPropertyType] = useState('')

  // Detail fields (collapsible)
  const [showDetails, setShowDetails] = useState(false)
  const [sqm, setSqm] = useState('')
  const [rooms, setRooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [floor, setFloor] = useState('')
  const [totalFloors, setTotalFloors] = useState('')
  const [condition, setCondition] = useState('')
  const [features, setFeatures] = useState<string[]>([])
  const [estimatedValue, setEstimatedValue] = useState('')
  const [doorbell, setDoorbell] = useState('')
  const [buildingNotes, setBuildingNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced geocode when both street + civico are present
  useEffect(() => {
    if (geoRef.current) clearTimeout(geoRef.current)
    if (!street.trim() || !civico.trim()) { setLatitude(null); setLongitude(null); return }
    geoRef.current = setTimeout(async () => {
      setGeocoding(true)
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
        setGeocoding(false)
      }
    }, 500)
    return () => { if (geoRef.current) clearTimeout(geoRef.current) }
  }, [street, civico, cityProximity])

  function toggleFeature(value: string) {
    setFeatures((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value])
  }

  async function handleCreate() {
    if (!street.trim()) { toast.error("L'indirizzo è obbligatorio"); return }
    if (!city.trim()) { toast.error('La città è obbligatoria'); return }
    if (!zone.trim()) { toast.error('La zona è obbligatoria'); return }

    const address = civico.trim() ? `${street.trim()} ${civico.trim()}` : street.trim()
    setSubmitting(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          city: city.trim(),
          zone: zone.trim(),
          sub_zone: subZone.trim() || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          transaction_type: transactionType || null,
          property_type: propertyType || null,
          sqm: sqm ? Number(sqm) : null,
          rooms: rooms ? Number(rooms) : null,
          bathrooms: bathrooms !== '' ? Number(bathrooms) : null,
          floor: floor !== '' ? Number(floor) : null,
          total_floors: totalFloors ? Number(totalFloors) : null,
          condition: condition || null,
          features,
          estimated_value: estimatedValue ? Number(estimatedValue) : null,
          doorbell: doorbell.trim() || null,
          building_notes: buildingNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { id } = await res.json()
      toast.success('Immobile creato e collegato')
      onCreated({ id, address, city: city.trim(), stage: 'sconosciuto' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-xl border border-[oklch(0.57_0.20_33/0.25)] bg-[oklch(0.57_0.20_33/0.04)] p-4 space-y-3">
      <p className="text-xs font-semibold text-[oklch(0.57_0.20_33)]">Nuovo immobile in banca dati</p>

      <div className="space-y-1.5">
        <Label>Città *</Label>
        <CityAutocomplete
          value={city}
          onChange={setCity}
          onSelect={(s) => {
            setCity(s.city)
            setCityProximity(`${s.longitude},${s.latitude}`)
            setZone('')
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Indirizzo *</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <AddressAutocomplete
              value={street}
              onChange={setStreet}
              onSelect={(s) => {
                setStreet(s.address)
                if (!city && s.city) setCity(s.city)
                setLatitude(null)
                setLongitude(null)
              }}
              placeholder="Via Roma, Viale Mazzini…"
              proximity={cityProximity ?? undefined}
            />
          </div>
          <Input
            value={civico}
            onChange={(e) => setCivico(e.target.value)}
            placeholder="N° civ."
            className="w-20 shrink-0"
          />
        </div>
        {geocoding && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Ricerca coordinate…
          </p>
        )}
        {!geocoding && latitude && longitude && (
          <p className="text-xs text-green-600 dark:text-green-400">✓ Coordinate acquisite</p>
        )}
      </div>

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

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Tipo operazione</Label>
          <Select
            value={transactionType || 'none'}
            onValueChange={(v) => setTransactionType(!v || v === 'none' ? '' : v)}
          >
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
          <Select
            value={propertyType || 'none'}
            onValueChange={(v) => setPropertyType(!v || v === 'none' ? '' : v)}
          >
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

      {/* Collapsible detail fields */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="flex w-full items-center justify-between text-left py-1"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Altri dettagli <span className="font-normal">(superficie, locali, caratteristiche…)</span>
        </span>
        {showDetails
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        }
      </button>

      {showDetails && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Superficie (m²)</Label>
              <Input type="number" min="1" placeholder="Es. 85" value={sqm} onChange={(e) => setSqm(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Locali</Label>
              <Input type="number" min="1" placeholder="Es. 4" value={rooms} onChange={(e) => setRooms(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label>Bagni</Label>
              <Input type="number" min="0" placeholder="Es. 2" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Piano</Label>
              <Input type="number" min="-5" placeholder="Es. 3" value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Piani tot.</Label>
              <Input type="number" min="1" placeholder="Es. 6" value={totalFloors} onChange={(e) => setTotalFloors(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Condizioni</Label>
              <Select value={condition || 'none'} onValueChange={(v) => setCondition(!v || v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Non specificato" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non specificato</SelectItem>
                  <SelectItem value="ottimo">Ottimo</SelectItem>
                  <SelectItem value="buono">Buono</SelectItem>
                  <SelectItem value="sufficiente">Sufficiente</SelectItem>
                  <SelectItem value="da_ristrutturare">Da ristrutturare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valutazione (€)</Label>
              <Input type="number" min="0" placeholder="Es. 250000" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Campanello / Interno</Label>
              <Input placeholder="Es. Rossi, Int. 5" value={doorbell} onChange={(e) => setDoorbell(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note palazzo</Label>
              <Input placeholder="Es. Codice portone…" value={buildingNotes} onChange={(e) => setBuildingNotes(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Caratteristiche</Label>
            <div className="flex flex-wrap gap-1.5">
              {FEATURES_LIST.map((f) => {
                const active = features.includes(f.value)
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleFeature(f.value)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
                        : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="button" size="sm" onClick={handleCreate} disabled={submitting}>
          {submitting && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Crea immobile
        </Button>
      </div>
    </div>
  )
}
