'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Zone {
  id: string
  name: string
  city: string
  sub_zones: { id: string; name: string }[]
}

interface ZoneSelectorProps {
  city: string
  value: string
  subZoneValue?: string
  onChange: (zone: string) => void
  onSubZoneChange?: (subZone: string) => void
  disabled?: boolean
  className?: string
}

export function ZoneSelector({
  city,
  value,
  subZoneValue = '',
  onChange,
  onSubZoneChange,
  disabled = false,
  className,
}: ZoneSelectorProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [newZoneDialogOpen, setNewZoneDialogOpen] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [creating, setCreating] = useState(false)

  const selectedZone = zones.find((z) => z.name === value)
  const subZones = selectedZone?.sub_zones ?? []

  useEffect(() => {
    if (!city) return
    setLoading(true)
    fetch(`/api/zones?city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((data) => setZones(data.zones ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [city])

  async function handleCreateZone() {
    if (!newZoneName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, name: newZoneName.trim() }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast.success('Zona creata')
      // Reload zones
      const updated = await fetch(`/api/zones?city=${encodeURIComponent(city)}`).then((r) => r.json())
      setZones(updated.zones ?? [])
      onChange(newZoneName.trim())
      setNewZoneDialogOpen(false)
      setNewZoneName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Zone selector */}
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={onChange}
          disabled={disabled || loading || !city}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? 'Caricamento...' : !city ? 'Prima seleziona la città' : 'Seleziona zona...'} />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || !city}
          onClick={() => setNewZoneDialogOpen(true)}
          title="Nuova zona"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sub-zone selector */}
      {onSubZoneChange && subZones.length > 0 && (
        <Select value={subZoneValue} onValueChange={onSubZoneChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Sotto-zona (opzionale)..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nessuna sotto-zona</SelectItem>
            {subZones.map((sz) => (
              <SelectItem key={sz.id} value={sz.name}>{sz.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* New zone dialog */}
      <Dialog open={newZoneDialogOpen} onOpenChange={setNewZoneDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuova zona — {city}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome zona *</Label>
              <Input
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="Es. Centro Storico, Lungarno, ..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreateZone()}
              />
            </div>
            {zones.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Zone esistenti: {zones.map((z) => z.name).join(', ')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewZoneDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleCreateZone} disabled={creating || !newZoneName.trim()}>
              {creating ? 'Creando...' : 'Crea zona'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
