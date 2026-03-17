'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Group } from '@/lib/supabase/types'

export function GroupForm({ group }: { group: Group }) {
  const router = useRouter()
  const [name, setName] = useState(group.name)
  const [showCrossAgency, setShowCrossAgency] = useState(group.show_cross_agency_results)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/group/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), show_cross_agency_results: showCrossAgency }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Impostazioni gruppo salvate')
      router.refresh()
    } else {
      toast.error('Errore nel salvataggio')
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="group-name">Nome del gruppo</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Gruppo Barner"
        />
      </div>

      {/* Cross-agency visibility toggle */}
      <div className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 px-4 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Mostra risultati tra agenzie</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se attivo, gli agenti di ogni agenzia possono vedere le classifiche di tutto il gruppo.
            Se disattivo, ogni agenzia vede solo i propri risultati.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCrossAgency((v) => !v)}
          className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
            showCrossAgency
              ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)]'
              : 'border-border bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              showCrossAgency ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        {showCrossAgency ? (
          <Eye className="h-3.5 w-3.5 text-green-600 shrink-0" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        {showCrossAgency
          ? 'Tutti gli agenti del gruppo vedono le classifiche globali'
          : 'Ogni agenzia vede solo i propri risultati'}
      </div>

      <button onClick={handleSave} disabled={loading || !name.trim()} className="btn-ai gap-2 disabled:opacity-60">
        <Save className="h-4 w-4" />
        {loading ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}
