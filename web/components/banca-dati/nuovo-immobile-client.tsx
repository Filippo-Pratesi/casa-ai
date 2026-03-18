'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { AddressAutocomplete } from './address-autocomplete'
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
}

export function NuovoImmobileClient({ agentDefaultZones }: NuovoImmobileClientProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [zone, setZone] = useState('')
  const [subZone, setSubZone] = useState('')
  const [doorbell, setDoorbell] = useState('')
  const [buildingNotes, setBuildingNotes] = useState('')
  const [initialNote, setInitialNote] = useState('')

  const [nearby, setNearby] = useState<NearbyResult | null>(null)
  const [loadingNearby, setLoadingNearby] = useState(false)

  // Auto-set zone from agent defaults when city changes
  useEffect(() => {
    if (city && !zone) {
      const defaultZone = agentDefaultZones.find((z) => z.city.toLowerCase() === city.toLowerCase())
      if (defaultZone) setZone(defaultZone.name)
    }
  }, [city, zone, agentDefaultZones])

  // Load nearby when coordinates are set
  useEffect(() => {
    if (!latitude || !longitude) return
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    setLoadingNearby(true)
    fetch(`/api/properties/nearby?lat=${latitude}&lng=${longitude}&radius=100`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setNearby(data))
      .catch((err) => { if (err?.name !== 'AbortError') console.error('Nearby fetch failed:', err) })
      .finally(() => { clearTimeout(timeoutId); setLoadingNearby(false) })
    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [latitude, longitude])

  function handleAddressSelect(suggestion: { address: string; city: string; latitude: number; longitude: number }) {
    setAddress(suggestion.address)
    setCity(suggestion.city)
    setLatitude(suggestion.latitude)
    setLongitude(suggestion.longitude)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!address.trim()) { toast.error('L\'indirizzo è obbligatorio'); return }
    if (!city.trim()) { toast.error('La città è obbligatoria'); return }
    if (!zone.trim()) { toast.error('La zona è obbligatoria'); return }
    if (!latitude || !longitude) { toast.error('Seleziona un indirizzo dalle suggerimenti per ottenere le coordinate'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          city: city.trim(),
          zone: zone.trim(),
          sub_zone: subZone.trim() || null,
          latitude,
          longitude,
          doorbell: doorbell.trim() || null,
          building_notes: buildingNotes.trim() || null,
          initial_note: initialNote.trim() || null,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      const { id } = await res.json()
      toast.success('Immobile aggiunto alla banca dati')
      router.push(`/banca-dati/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSubmitting(false)
    }
  }

  const hasNearby = nearby && (nearby.same_building.length > 0 || nearby.nearby.length > 0)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/banca-dati"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
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
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Es. Pisa, Firenze, Milano..."
            />
          </div>

          {/* Address with Mapbox autocomplete */}
          <div className="space-y-1.5">
            <Label>Indirizzo *</Label>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSelect}
              placeholder="Via Roma 12..."
            />
            {latitude && longitude && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Coordinate acquisite ({latitude.toFixed(5)}, {longitude.toFixed(5)})
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
        </Card>

        {/* Nearby properties (appears after coordinate selection) */}
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

        {/* Submit */}
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/banca-dati">Annulla</Link>
          </Button>
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
