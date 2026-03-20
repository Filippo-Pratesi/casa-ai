'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Zone {
  id: string
  name: string
  city: string
  omi_zone_code: string | null
  sub_zones: { id: string; name: string }[]
}

interface ZoneManagementProps {
  initialZones: Zone[]
}

export function ZoneManagement({ initialZones }: ZoneManagementProps) {
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editOmi, setEditOmi] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // New zone form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newName, setNewName] = useState('')
  const [newOmi, setNewOmi] = useState('')
  const [creating, setCreating] = useState(false)

  // Group by city
  const cities = [...new Set(zones.map((z) => z.city))].sort()

  function toggleCity(city: string) {
    setExpandedCities((prev) => ({ ...prev, [city]: !prev[city] }))
  }

  function startEdit(zone: Zone) {
    setEditingId(zone.id)
    setEditName(zone.name)
    setEditOmi(zone.omi_zone_code ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditOmi('')
  }

  async function saveEdit(zone: Zone) {
    const name = editName.trim()
    if (!name) { toast.error('Il nome è obbligatorio'); return }
    const omi = editOmi.trim() || null
    const nameChanged = name !== zone.name
    const omiChanged = omi !== zone.omi_zone_code

    if (!nameChanged && !omiChanged) { cancelEdit(); return }

    setSaving(true)
    try {
      const res = await fetch('/api/zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: zone.id,
          ...(nameChanged ? { new_name: name } : {}),
          ...(omiChanged ? { omi_zone_code: omi } : {}),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Errore')
      }
      setZones((prev) => prev.map((z) =>
        z.id === zone.id
          ? { ...z, name: nameChanged ? name : z.name, omi_zone_code: omiChanged ? omi : z.omi_zone_code }
          : z
      ))
      cancelEdit()
      toast.success('Zona aggiornata')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  async function deleteZone(zone: Zone) {
    if (deletingId !== zone.id) {
      setDeletingId(zone.id)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/zones?id=${zone.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Errore')
      }
      setZones((prev) => prev.filter((z) => z.id !== zone.id))
      setDeletingId(null)
      toast.success('Zona eliminata')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nell\'eliminazione')
      setDeletingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function createZone(e: React.FormEvent) {
    e.preventDefault()
    const city = newCity.trim()
    const name = newName.trim()
    if (!city) { toast.error('La città è obbligatoria'); return }
    if (!name) { toast.error('Il nome è obbligatorio'); return }
    const omi = newOmi.trim() || null

    setCreating(true)
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, name, omi_zone_code: omi }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Errore')
      }
      const { id } = await res.json()
      setZones((prev) => [...prev, { id, name, city, omi_zone_code: omi, sub_zones: [] }])
      setExpandedCities((prev) => ({ ...prev, [city]: true }))
      setNewCity('')
      setNewName('')
      setNewOmi('')
      setShowNewForm(false)
      toast.success('Zona creata')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setCreating(false)
    }
  }

  if (zones.length === 0 && !showNewForm) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-muted-foreground">Nessuna zona configurata.</p>
        <Button size="sm" onClick={() => setShowNewForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Crea prima zona
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Zone list grouped by city */}
      {cities.map((city) => {
        const cityZones = zones.filter((z) => z.city === city)
        const expanded = expandedCities[city] !== false // default open
        return (
          <div key={city} className="rounded-lg border border-border overflow-hidden">
            {/* City header */}
            <button
              type="button"
              onClick={() => toggleCity(city)}
              className="flex w-full items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{city}</span>
                <span className="text-xs text-muted-foreground">({cityZones.length} zone)</span>
              </div>
              {expanded
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </button>

            {/* Zones */}
            {expanded && (
              <div className="divide-y divide-border/60">
                {cityZones.map((zone) => (
                  <div key={zone.id} className="px-4 py-3">
                    {editingId === zone.id ? (
                      /* Edit row */
                      <div className="flex items-end gap-2 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-[120px]">
                          <Label className="text-xs">Nome zona</Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1 w-28 shrink-0">
                          <Label className="text-xs">Codice OMI</Label>
                          <Input
                            value={editOmi}
                            onChange={(e) => setEditOmi(e.target.value.toUpperCase())}
                            placeholder="Es. B2"
                            className="h-8 text-sm"
                            maxLength={10}
                          />
                        </div>
                        <div className="flex gap-1 pb-0.5">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-2.5"
                            onClick={() => saveEdit(zone)}
                            disabled={saving}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display row */
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-medium truncate">{zone.name}</span>
                          {zone.omi_zone_code && (
                            <span className="shrink-0 rounded bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5">
                              OMI {zone.omi_zone_code}
                            </span>
                          )}
                          {zone.sub_zones.length > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {zone.sub_zones.length} sotto-zone
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(zone)}
                            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            title="Modifica"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteZone(zone)}
                            disabled={saving}
                            className={cn(
                              'rounded p-1.5 transition-colors',
                              deletingId === zone.id
                                ? 'text-red-600 bg-red-50 dark:bg-red-950'
                                : 'text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
                            )}
                            title={deletingId === zone.id ? 'Clicca di nuovo per confermare' : 'Elimina'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* New zone form */}
      {showNewForm ? (
        <form onSubmit={createZone} className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-medium">Nuova zona</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Città *</Label>
              <Input
                placeholder="Es. Viareggio"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome zona *</Label>
              <Input
                placeholder="Es. Centro Storico"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5 max-w-[160px]">
            <Label className="text-xs">Codice OMI <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <Input
              placeholder="Es. B2"
              value={newOmi}
              onChange={(e) => setNewOmi(e.target.value.toUpperCase())}
              className="h-8 text-sm"
              maxLength={10}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? 'Salvataggio…' : 'Crea zona'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>
              Annulla
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNewForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Aggiungi zona
        </Button>
      )}

      {/* Reset confirm hint */}
      {deletingId && (
        <p className="text-xs text-muted-foreground text-center">
          Clicca di nuovo sul cestino per confermare l&apos;eliminazione
        </p>
      )}
    </div>
  )
}
