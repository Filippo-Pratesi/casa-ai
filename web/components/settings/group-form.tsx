'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">Mostra risultati tra agenzie</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Se attivo, gli agenti di ogni agenzia possono vedere le classifiche di tutto il gruppo.
            Se disattivo, ogni agenzia vede solo i propri risultati.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCrossAgency((v) => !v)}
          className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
            showCrossAgency
              ? 'border-neutral-900 bg-neutral-900'
              : 'border-neutral-300 bg-neutral-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              showCrossAgency ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-500 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5">
        {showCrossAgency ? (
          <Eye className="h-3.5 w-3.5 text-green-600 shrink-0" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
        )}
        {showCrossAgency
          ? 'Tutti gli agenti del gruppo vedono le classifiche globali'
          : 'Ogni agenzia vede solo i propri risultati'}
      </div>

      <Button onClick={handleSave} disabled={loading || !name.trim()} className="gap-2">
        <Save className="h-4 w-4" />
        {loading ? 'Salvataggio...' : 'Salva modifiche'}
      </Button>
    </div>
  )
}
