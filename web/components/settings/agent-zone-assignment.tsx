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

interface Assignment {
  id: string
  agent_id: string
  zone_id: string
  agent_name: string
  zone_name: string
  city: string
}

interface AgentZoneAssignmentProps {
  assignments: Assignment[]
  agents: { id: string; name: string }[]
  zones: { id: string; name: string; city: string }[]
}

export function AgentZoneAssignment({ assignments: initialAssignments, agents, zones }: AgentZoneAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [newAgentId, setNewAgentId] = useState('')
  const [newZoneId, setNewZoneId] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleAdd = useCallback(async () => {
    if (!newAgentId || !newZoneId) {
      toast.error('Seleziona agente e zona')
      return
    }
    // Check for duplicate
    if (assignments.some(a => a.agent_id === newAgentId && a.zone_id === newZoneId)) {
      toast.error('Questa assegnazione esiste già')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/agent-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: newAgentId, zone_id: newZoneId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Errore' }))
        throw new Error(data.error ?? 'Errore salvataggio')
      }
      const { id } = await res.json()
      const agent = agents.find(a => a.id === newAgentId)
      const zone = zones.find(z => z.id === newZoneId)
      const newAssignment: Assignment = {
        id,
        agent_id: newAgentId,
        zone_id: newZoneId,
        agent_name: agent?.name ?? 'Agente',
        zone_name: zone?.name ?? '',
        city: zone?.city ?? '',
      }
      setAssignments(prev => [...prev, newAssignment])
      setNewAgentId('')
      setNewZoneId('')
      toast.success('Assegnazione aggiunta')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setAdding(false)
    }
  }, [newAgentId, newZoneId, assignments, agents, zones])

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

  // Group by city for display
  const cities = Array.from(new Set(zones.map(z => z.city))).sort()

  return (
    <div className="space-y-4">
      {/* Existing assignments */}
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna assegnazione configurata.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Agente</span>
            <span>Città</span>
            <span>Zona</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {assignments.map((a) => (
              <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-center px-3 py-2.5">
                <span className="text-sm font-medium truncate">{a.agent_name}</span>
                <span className="text-sm text-muted-foreground truncate">{a.city}</span>
                <span className="text-sm text-muted-foreground truncate">{a.zone_name}</span>
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

      {/* Add new assignment */}
      <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nuova assegnazione</p>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Agente</span>
            <Select value={newAgentId || 'none'} onValueChange={(v) => setNewAgentId(!v || v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleziona agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleziona agente</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Zona</span>
            <Select value={newZoneId || 'none'} onValueChange={(v) => setNewZoneId(!v || v === 'none' ? '' : v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Seleziona zona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleziona zona</SelectItem>
                {cities.map(city => (
                  <div key={city}>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{city}</div>
                    {zones.filter(z => z.city === city).map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            disabled={adding || !newAgentId || !newZoneId}
            size="sm"
            className="h-8 gap-1"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Aggiungi
          </Button>
        </div>
      </div>
    </div>
  )
}
