'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface Assignment {
  id: string
  agent_id: string
  zone_id: string
  sub_zone_id: string | null
  agent_name: string
  zone_name: string
  sub_zone_name: string | null
  city: string
}

interface SubZone {
  id: string
  name: string
  zone_id: string
}

interface AgentZoneAssignmentProps {
  assignments: Assignment[]
  agents: { id: string; name: string; email?: string }[]
  zones: { id: string; name: string; city: string }[]
  subZones: SubZone[]
}

function agentDisplayName(a: { name?: string | null; email?: string | null }): string {
  return a.name?.trim() || a.email?.split('@')[0] || 'Agente'
}

export function AgentZoneAssignment({
  assignments: initialAssignments,
  agents,
  zones,
  subZones,
}: AgentZoneAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [newAgentId, setNewAgentId] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newZoneId, setNewZoneId] = useState('')
  const [newSubZoneId, setNewSubZoneId] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Derived lists for cascading selects
  const cities = Array.from(new Set(zones.map(z => z.city))).sort()
  const cityZones = newCity ? zones.filter(z => z.city === newCity) : []
  const zoneSubZones = newZoneId ? subZones.filter(sz => sz.zone_id === newZoneId) : []
  const hasSubZones = zoneSubZones.length > 0

  function handleCityChange(city: string) {
    setNewCity(city)
    setNewZoneId('')  // reset cascade
    setNewSubZoneId('')
  }

  function handleZoneChange(zoneId: string) {
    setNewZoneId(zoneId)
    setNewSubZoneId('')  // reset sub-zone when zone changes
  }

  const handleAdd = useCallback(async () => {
    if (!newAgentId || !newZoneId) {
      toast.error('Seleziona agente e zona')
      return
    }
    if (assignments.some(a =>
      a.agent_id === newAgentId &&
      a.zone_id === newZoneId &&
      (a.sub_zone_id ?? null) === (newSubZoneId || null)
    )) {
      toast.error('Questa assegnazione esiste già')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/agent-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: newAgentId,
          zone_id: newZoneId,
          sub_zone_id: newSubZoneId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error ?? 'Errore salvataggio')
      }
      const { id } = await res.json()
      const agent = agents.find(a => a.id === newAgentId)
      const zone = zones.find(z => z.id === newZoneId)
      const subZone = newSubZoneId ? subZones.find(sz => sz.id === newSubZoneId) : null
      setAssignments(prev => [...prev, {
        id,
        agent_id: newAgentId,
        zone_id: newZoneId,
        sub_zone_id: newSubZoneId || null,
        agent_name: agent ? agentDisplayName(agent) : 'Agente',
        zone_name: zone?.name ?? '',
        sub_zone_name: subZone?.name ?? null,
        city: zone?.city ?? newCity,
      }])
      setNewAgentId('')
      setNewCity('')
      setNewZoneId('')
      setNewSubZoneId('')
      toast.success('Assegnazione aggiunta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAdding(false)
    }
  }, [newAgentId, newCity, newZoneId, newSubZoneId, assignments, agents, zones, subZones])

  const handleRemove = useCallback(async (assignmentId: string) => {
    setRemovingId(assignmentId)
    try {
      const res = await fetch(`/api/agent-zones/${assignmentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error ?? 'Errore rimozione')
      }
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      toast.success('Assegnazione rimossa')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setRemovingId(null)
    }
  }, [])

  const hasAnySubZone = assignments.some(a => a.sub_zone_name)

  return (
    <div className="space-y-4">
      {/* Existing assignments */}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna assegnazione configurata.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className={cn(
            'grid gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider',
            hasAnySubZone ? 'grid-cols-[1fr_1fr_1fr_1fr_40px]' : 'grid-cols-[1fr_1fr_1fr_40px]'
          )}>
            <span>Agente</span>
            <span>Città</span>
            <span>Zona</span>
            {hasAnySubZone && <span>Sotto-zona</span>}
            <span />
          </div>
          <div className="divide-y divide-border">
            {assignments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'grid gap-2 items-center px-3 py-2.5',
                  hasAnySubZone ? 'grid-cols-[1fr_1fr_1fr_1fr_40px]' : 'grid-cols-[1fr_1fr_1fr_40px]'
                )}
              >
                <span className="text-sm font-medium truncate">{a.agent_name}</span>
                <span className="text-sm text-muted-foreground truncate">{a.city}</span>
                <span className="text-sm text-muted-foreground truncate">{a.zone_name}</span>
                {hasAnySubZone && (
                  <span className="text-sm text-muted-foreground truncate">
                    {a.sub_zone_name ?? <span className="opacity-40">—</span>}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(a.id)}
                  disabled={removingId === a.id}
                >
                  {removingId === a.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />
                  }
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new assignment — cascading City → Zone → Sub-zone */}
      <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Nuova assegnazione
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Agente */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Agente</span>
            <Select
              value={newAgentId || 'none'}
              onValueChange={(v) => setNewAgentId(!v || v === 'none' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <span className={cn('truncate', !newAgentId && 'text-muted-foreground')}>
                  {newAgentId
                    ? agentDisplayName(agents.find(a => a.id === newAgentId) ?? {})
                    : 'Seleziona agente'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleziona agente…</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {agentDisplayName(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Città */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Città</span>
            <Select
              value={newCity || 'none'}
              onValueChange={(v) => handleCityChange(!v || v === 'none' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <span className={cn('truncate', !newCity && 'text-muted-foreground')}>
                  {newCity || 'Seleziona città'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleziona città…</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zona — disabilitata fino a che non è selezionata la città */}
          <div className="space-y-1">
            <span className={cn('text-xs', newCity ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
              Zona
            </span>
            <Select
              value={newZoneId || 'none'}
              onValueChange={(v) => handleZoneChange(!v || v === 'none' ? '' : v)}
              disabled={!newCity}
            >
              <SelectTrigger className={cn('h-9 text-sm', !newCity && 'opacity-50 cursor-not-allowed')}>
                <span className={cn('truncate', !newZoneId && 'text-muted-foreground')}>
                  {newZoneId
                    ? (cityZones.find(z => z.id === newZoneId)?.name ?? 'Zona')
                    : newCity ? 'Seleziona zona' : 'Prima seleziona la città'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleziona zona…</SelectItem>
                {cityZones.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sotto-zona — disabilitata fino a che non è selezionata la zona (e solo se esistono sotto-zone) */}
          <div className="space-y-1">
            <span className={cn('text-xs', hasSubZones ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
              Sotto-zona <span className="font-normal">(opzionale)</span>
            </span>
            <Select
              value={newSubZoneId || 'none'}
              onValueChange={(v) => setNewSubZoneId(!v || v === 'none' ? '' : v)}
              disabled={!newZoneId || !hasSubZones}
            >
              <SelectTrigger className={cn('h-9 text-sm', (!newZoneId || !hasSubZones) && 'opacity-50 cursor-not-allowed')}>
                <SelectValue placeholder={
                  !newZoneId ? 'Prima seleziona la zona'
                  : !hasSubZones ? 'Nessuna sotto-zona disponibile'
                  : 'Tutta la zona'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tutta la zona</SelectItem>
                {zoneSubZones.map(sz => (
                  <SelectItem key={sz.id} value={sz.id}>{sz.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={adding || !newAgentId || !newZoneId}
            size="sm"
            className="gap-1.5"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Aggiungi assegnazione
          </Button>
        </div>
      </div>
    </div>
  )
}
