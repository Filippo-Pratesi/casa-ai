'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddressAutocomplete } from './address-autocomplete'
import { CityAutocomplete } from './city-autocomplete'
import { ZoneSelector } from './zone-selector'
import { toast } from 'sonner'

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

      <div className="space-y-1.5">
        <Label>Tipo operazione</Label>
        <Select
          value={transactionType || 'none'}
          onValueChange={(v) => setTransactionType(!v || v === 'none' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Non specificato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non specificato</SelectItem>
            <SelectItem value="vendita">Vendita</SelectItem>
            <SelectItem value="affitto">Affitto</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
