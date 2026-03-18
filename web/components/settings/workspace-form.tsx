'use client'

import { useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Workspace } from '@/lib/supabase/types'

const TONES = [
  { value: 'standard', label: 'Standard' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'approachable', label: 'Accessibile' },
  { value: 'investment', label: 'Investimento' },
]

interface WorkspaceFormProps {
  workspace: Workspace
}

export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(workspace.name)
  const [tone, setTone] = useState(workspace.tone_default)

  function handleSave() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/workspace/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tone_default: tone }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Errore nel salvataggio')
        toast.success('Impostazioni salvate')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">Nome agenzia / ufficio</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Immobiliare Rossi — Filiale Milano"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Tono predefinito</Label>
        <Select value={tone} onValueChange={(v) => { if (v) setTone(v as typeof tone) }}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue>{TONES.find(t => t.value === tone)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Il tono selezionato sarà preselezionato nei nuovi annunci.</p>
      </div>
      <button onClick={handleSave} disabled={isPending} className="btn-ai disabled:opacity-60">
        <Save className="h-4 w-4" />
        {isPending ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}
