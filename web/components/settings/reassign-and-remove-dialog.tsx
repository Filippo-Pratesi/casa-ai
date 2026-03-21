'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, Building2, Users, Home, CalendarDays, CheckSquare, FileText, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface WorkloadCounts {
  properties: number
  contacts: number
  listings: number
  appointments: number
  todos: number
  proposals: number
  invoices: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  /** All workspace members except the one being removed */
  otherMembers: Member[]
  onSuccess: () => void
}

const WORKLOAD_ICONS: Record<keyof WorkloadCounts, React.ReactNode> = {
  properties:   <Building2    className="h-3.5 w-3.5" />,
  contacts:     <Users        className="h-3.5 w-3.5" />,
  listings:     <Home         className="h-3.5 w-3.5" />,
  appointments: <CalendarDays className="h-3.5 w-3.5" />,
  todos:        <CheckSquare  className="h-3.5 w-3.5" />,
  proposals:    <FileText     className="h-3.5 w-3.5" />,
  invoices:     <Receipt      className="h-3.5 w-3.5" />,
}
const WORKLOAD_LABELS: Record<keyof WorkloadCounts, string> = {
  properties:   'Immobili',
  contacts:     'Contatti',
  listings:     'Annunci',
  appointments: 'Appuntamenti',
  todos:        'Task aperti',
  proposals:    'Proposte',
  invoices:     'Fatture',
}

export function ReassignAndRemoveDialog({ open, onOpenChange, member, otherMembers, onSuccess }: Props) {
  const [counts, setCounts]           = useState<WorkloadCounts | null>(null)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [targetId, setTargetId]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Fetch workload when dialog opens
  useEffect(() => {
    if (!open || !member) return
    setTargetId('')
    setError(null)
    setCounts(null)
    setLoadingCounts(true)
    fetch(`/api/workspace/members/${member.id}/workload`)
      .then(r => r.json())
      .then((d: { counts?: WorkloadCounts; error?: string }) => {
        if (d.counts) setCounts(d.counts)
        else setError(d.error ?? 'Errore nel caricamento')
      })
      .catch(() => setError('Errore di rete'))
      .finally(() => setLoadingCounts(false))
  }, [open, member])

  const totalItems = counts
    ? Object.values(counts).reduce((s, n) => s + n, 0)
    : 0

  const activeItems = counts
    ? (Object.entries(counts) as [keyof WorkloadCounts, number][]).filter(([, n]) => n > 0)
    : []

  async function handleConfirm() {
    if (!member || !targetId) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/workspace/members/${member.id}/reassign-and-remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_agent_id: targetId }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Errore sconosciuto')
      onOpenChange(false)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setSubmitting(false)
    }
  }

  if (!member) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Riassegna e rimuovi {member.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Workload summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Pratiche attive di {member.name}
            </p>

            {loadingCounts && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loadingCounts && counts && totalItems === 0 && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
                Nessuna pratica attiva assegnata. Puoi rimuoverlo direttamente.
              </div>
            )}

            {!loadingCounts && counts && totalItems > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Verranno riassegnate <strong>{totalItems}</strong> pratiche al nuovo agente:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {activeItems.map(([key, n]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                      <span className="text-amber-600 dark:text-amber-500">{WORKLOAD_ICONS[key]}</span>
                      <span className="font-semibold tabular-nums">{n}</span>
                      <span>{WORKLOAD_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Target agent selector — always shown when there are items OR even when 0 (to keep flow consistent) */}
          {!loadingCounts && counts && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                {totalItems > 0 ? 'Assegna pratiche a' : 'Conferma rimozione'}
              </label>
              {otherMembers.length === 0 ? (
                <p className="text-sm text-red-600">
                  Non ci sono altri agenti nel workspace. Aggiungi un membro prima di procedere.
                </p>
              ) : (
                <select
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                >
                  <option value="">— Seleziona agente —</option>
                  {otherMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
              {error}
            </p>
          )}

          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 text-xs text-muted-foreground">
            <strong>Attenzione:</strong> questa azione è irreversibile. {member.name} perderà l&apos;accesso al workspace.
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || loadingCounts || !targetId || otherMembers.length === 0}
            className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {submitting ? 'Rimozione…' : 'Riassegna e rimuovi'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
