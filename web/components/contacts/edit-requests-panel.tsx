'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, Clock, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface EditRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  changes: Record<string, { old: string; new: string }>
  note: string | null
  rejection_reason: string | null
  created_at: string
  reviewed_at: string | null
  contact: { id: string; name: string } | null
  requester: { id: string; name: string; email: string } | null
  requester_workspace: { id: string; name: string } | null
  owner_workspace: { id: string; name: string } | null
  owner_workspace_id: string
  requester_id: string
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'Email',
  phone: 'Telefono',
  budget_min: 'Budget min',
  budget_max: 'Budget max',
}

interface EditRequestsPanelProps {
  currentUserId: string
  currentWorkspaceId: string
  isAdmin: boolean
}

export function EditRequestsPanel({ currentUserId, currentWorkspaceId, isAdmin }: EditRequestsPanelProps) {
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts/edit-requests')
      const data = await res.json()
      setRequests(data.requests ?? [])
    } catch {
      toast.error('Errore nel caricamento delle richieste')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  async function handleAction(requestId: string, action: 'approved' | 'rejected', rejectionReason?: string) {
    setActionLoading(requestId)
    try {
      const res = await fetch(`/api/contacts/edit-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: rejectionReason ?? null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(action === 'approved' ? 'Modifica approvata e applicata' : 'Modifica rifiutata')
      setRejectTarget(null)
      setRejectReason('')
      await loadRequests()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  const pendingIncoming = requests.filter(
    (r) => r.status === 'pending' && r.owner_workspace_id === currentWorkspaceId
  )
  const myRequests = requests.filter((r) => r.requester_id === currentUserId)

  if (!loading && requests.length === 0) return null

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Richieste di modifica</span>
          {pendingIncoming.length > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
              {pendingIncoming.length} in attesa
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Incoming pending (for admins) */}
              {isAdmin && pendingIncoming.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-orange-50">
                    Da approvare ({pendingIncoming.length})
                  </p>
                  {pendingIncoming.map((req) => (
                    <div key={req.id} className="px-4 py-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{req.contact?.name ?? '—'}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span>{req.requester_workspace?.name ?? '—'}</span>
                            <span>·</span>
                            <span>{req.requester?.name}</span>
                          </div>
                          {req.note && (
                            <p className="text-xs text-muted-foreground italic mt-1">&ldquo;{req.note}&rdquo;</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-green-600 hover:bg-green-50 hover:border-green-300"
                            disabled={actionLoading === req.id}
                            onClick={() => handleAction(req.id, 'approved')}
                            title="Approva"
                          >
                            {actionLoading === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 text-red-500 hover:bg-red-50 hover:border-red-300"
                            disabled={actionLoading === req.id}
                            onClick={() => setRejectTarget(req.id)}
                            title="Rifiuta"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Changes diff */}
                      <div className="space-y-1.5 bg-muted/30 rounded-lg p-2.5">
                        {Object.entries(req.changes).map(([field, diff]) => (
                          <div key={field} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-16 shrink-0">{FIELD_LABELS[field] ?? field}:</span>
                            <span className="line-through text-red-500">{diff.old || '—'}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 font-medium">{diff.new || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* My sent requests */}
              {myRequests.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                    Le mie richieste ({myRequests.length})
                  </p>
                  {myRequests.map((req) => (
                    <div key={req.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{req.contact?.name ?? '—'}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{req.owner_workspace?.name ?? '—'}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs shrink-0',
                          req.status === 'pending' && 'border-orange-300 text-orange-700 bg-orange-50',
                          req.status === 'approved' && 'border-green-300 text-green-700 bg-green-50',
                          req.status === 'rejected' && 'border-red-300 text-red-700 bg-red-50',
                        )}
                      >
                        {req.status === 'pending' && 'In attesa'}
                        {req.status === 'approved' && 'Approvata'}
                        {req.status === 'rejected' && 'Rifiutata'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta modifica</DialogTitle>
            <DialogDescription>
              Puoi aggiungere una motivazione che verrà inviata all&apos;agente richiedente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivazione (opzionale)..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Annulla</Button>
            <Button
              variant="destructive"
              disabled={!!actionLoading}
              onClick={() => rejectTarget && handleAction(rejectTarget, 'rejected', rejectReason)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rifiuta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
