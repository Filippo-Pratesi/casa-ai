'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Building2, Users, Share2, Plus, Trash2, Loader2, UserCheck, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Workspace {
  id: string
  name: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
}

interface Membership {
  user_id: string
  workspace_id: string
  role: string
  is_default: boolean
  joined_at: string
}

interface SharingEntry {
  id: string
  workspace_a_id: string
  workspace_b_id: string
  enabled: boolean
}

interface GroupManagementProps {
  groupId: string | null
}

const ROLE_LABELS: Record<string, string> = {
  agent: 'Agente',
  admin: 'Admin',
  group_admin: 'Group Admin',
}

export function GroupManagement({ groupId: _groupId }: GroupManagementProps) {
  const [activeSection, setActiveSection] = useState<'accessi' | 'condivisione'>('accessi')

  // Accessi state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loadingAccessi, setLoadingAccessi] = useState(true)

  // Condivisione state
  const [sharing, setSharing] = useState<SharingEntry[]>([])
  const [loadingSharing, setLoadingSharing] = useState(false)
  const [togglingPair, setTogglingPair] = useState<string | null>(null)

  // Add access dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addWorkspaceId, setAddWorkspaceId] = useState('')
  const [addRole, setAddRole] = useState<'agent' | 'admin'>('agent')
  const [addLoading, setAddLoading] = useState(false)

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<{ user_id: string; workspace_id: string; name: string; ws: string } | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  // New workspace dialog
  const [newWsOpen, setNewWsOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsLoading, setNewWsLoading] = useState(false)

  async function handleCreateWorkspace() {
    if (!newWsName.trim()) return
    setNewWsLoading(true)
    try {
      const res = await fetch('/api/group/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWsName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Agenzia "${data.workspace.name}" creata`)
      setNewWsOpen(false)
      setNewWsName('')
      await loadAccessi()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setNewWsLoading(false)
    }
  }

  const loadAccessi = useCallback(async () => {
    setLoadingAccessi(true)
    try {
      const res = await fetch('/api/group/members-access')
      const data = await res.json()
      setWorkspaces(data.workspaces ?? [])
      setProfiles(data.profiles ?? [])
      setMemberships(data.memberships ?? [])
    } catch {
      toast.error('Errore nel caricamento degli accessi')
    } finally {
      setLoadingAccessi(false)
    }
  }, [])

  const loadSharing = useCallback(async () => {
    setLoadingSharing(true)
    try {
      const res = await fetch('/api/group/contact-sharing')
      const data = await res.json()
      setSharing(data.sharing ?? [])
    } catch {
      toast.error('Errore nel caricamento della condivisione')
    } finally {
      setLoadingSharing(false)
    }
  }, [])

  useEffect(() => {
    loadAccessi()
  }, [loadAccessi])

  useEffect(() => {
    if (activeSection === 'condivisione' && workspaces.length > 0) {
      loadSharing()
    }
  }, [activeSection, workspaces.length, loadSharing])

  async function handleAddAccess() {
    if (!addUserId || !addWorkspaceId) return
    setAddLoading(true)
    try {
      const res = await fetch('/api/group/members-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: addUserId, workspace_id: addWorkspaceId, role: addRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Accesso aggiunto')
      setAddOpen(false)
      setAddUserId('')
      setAddWorkspaceId('')
      setAddRole('agent')
      await loadAccessi()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAddLoading(false)
    }
  }

  async function handleRemoveAccess() {
    if (!removeTarget) return
    setRemoveLoading(true)
    try {
      const res = await fetch('/api/group/members-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: removeTarget.user_id, workspace_id: removeTarget.workspace_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Accesso rimosso')
      setRemoveTarget(null)
      await loadAccessi()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRemoveLoading(false)
    }
  }

  async function handleToggleSharing(wsA: string, wsB: string, currentEnabled: boolean) {
    const pairKey = [wsA, wsB].sort().join('_')
    setTogglingPair(pairKey)
    try {
      const res = await fetch('/api/group/contact-sharing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_a_id: wsA,
          workspace_b_id: wsB,
          enabled: !currentEnabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(!currentEnabled ? 'Condivisione attivata' : 'Condivisione disattivata')
      await loadSharing()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTogglingPair(null)
    }
  }

  // Build user→workspaces map for the table
  const userWorkspaceMap: Record<string, { workspace: Workspace; role: string; is_default: boolean }[]> = {}
  for (const m of memberships) {
    const ws = workspaces.find((w) => w.id === m.workspace_id)
    if (!ws) continue
    if (!userWorkspaceMap[m.user_id]) userWorkspaceMap[m.user_id] = []
    userWorkspaceMap[m.user_id].push({ workspace: ws, role: m.role, is_default: m.is_default })
  }

  // Build sharing map: "wsA_wsB" -> enabled
  const sharingMap: Record<string, boolean> = {}
  for (const s of sharing) {
    const key = [s.workspace_a_id, s.workspace_b_id].sort().join('_')
    sharingMap[key] = s.enabled
  }

  // All workspace pairs
  const pairs: { a: Workspace; b: Workspace }[] = []
  for (let i = 0; i < workspaces.length; i++) {
    for (let j = i + 1; j < workspaces.length; j++) {
      pairs.push({ a: workspaces[i], b: workspaces[j] })
    }
  }

  // Available users (those already in the group = in memberships)
  const allUserIds = [...new Set(memberships.map((m) => m.user_id))]
  const allUsers = profiles.filter((p) => allUserIds.includes(p.id))

  if (!_groupId) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="font-medium text-foreground mb-1">Nessun gruppo configurato</p>
        <p>Contatta il supporto per attivare il tuo network e collegare le agenzie.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with new agency button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setActiveSection('accessi')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeSection === 'accessi' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Accessi Cross-Agenzia
        </button>
        <button
          onClick={() => setActiveSection('condivisione')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            activeSection === 'condivisione' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Share2 className="h-3.5 w-3.5" />
          Condivisione Contatti
        </button>
        </div>
        <Button size="sm" variant="outline" onClick={() => setNewWsOpen(true)}>
          <PlusCircle className="h-4 w-4 mr-1" />
          Nuova agenzia
        </Button>
      </div>

      {/* Section: Accessi Cross-Agenzia */}
      {activeSection === 'accessi' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Gestisci quali utenti possono accedere a più agenzie del network e con quale ruolo.
            </p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi accesso
            </Button>
          </div>

          {loadingAccessi ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nessun utente nel gruppo
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_1fr_120px_40px] gap-3 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Utente</span>
                <span>Agenzia</span>
                <span>Ruolo</span>
                <span></span>
              </div>
              {/* Data rows */}
              <div className="divide-y divide-border">
                {profiles.map((p) => {
                  const accesses = userWorkspaceMap[p.id] ?? []
                  if (accesses.length === 0) return null
                  return accesses.map((access, idx) => (
                    <div key={`${p.id}_${access.workspace.id}`} className="grid grid-cols-[1fr_1fr_120px_40px] gap-3 px-4 py-2.5 items-center">
                      {idx === 0 ? (
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      ) : <div />}
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm">{access.workspace.name}</span>
                        {access.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">principale</Badge>
                        )}
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[access.role] ?? access.role}
                        </Badge>
                      </div>
                      <div>
                        {!access.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveTarget({
                              user_id: p.id,
                              workspace_id: access.workspace.id,
                              name: p.name,
                              ws: access.workspace.name,
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section: Condivisione Contatti */}
      {activeSection === 'condivisione' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Abilita la condivisione contatti fra coppie di agenzie. Quando attiva, gli agenti potranno cercare contatti dell&apos;altra agenzia tramite la <strong>Ricerca Avanzata</strong> nella sezione Contatti.
          </p>

          {loadingSharing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pairs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Servono almeno 2 agenzie nel gruppo per configurare la condivisione
            </div>
          ) : (
            <div className="space-y-3">
              {pairs.map(({ a, b }) => {
                const key = [a.id, b.id].sort().join('_')
                const isEnabled = sharingMap[key] ?? false
                const isToggling = togglingPair === key
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{a.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">↔</span>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{b.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isEnabled && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <UserCheck className="h-3.5 w-3.5" />
                          Attiva
                        </div>
                      )}
                      {/* Toggle button replacing shadcn Switch */}
                      <button
                        onClick={() => !isToggling && handleToggleSharing(a.id, b.id, isEnabled)}
                        disabled={isToggling}
                        className={cn(
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          isEnabled ? 'bg-[oklch(0.57_0.20_33)]' : 'bg-input'
                        )}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        {isToggling ? (
                          <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                        ) : (
                          <span
                            className={cn(
                              'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
                              isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                            )}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Dialog: Add Access */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi accesso cross-agenzia</DialogTitle>
            <DialogDescription>
              Permetti a un utente del gruppo di accedere a un&apos;altra agenzia con un ruolo specifico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Utente</Label>
              <Select value={addUserId} onValueChange={(v) => setAddUserId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona utente">
                    {addUserId ? (() => { const u = allUsers.find(x => x.id === addUserId); return u ? `${u.name} — ${u.email}` : 'Seleziona utente' })() : 'Seleziona utente'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agenzia</Label>
              <Select value={addWorkspaceId} onValueChange={(v) => setAddWorkspaceId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona agenzia">
                    {addWorkspaceId ? (workspaces.find(w => w.id === addWorkspaceId)?.name ?? 'Seleziona agenzia') : 'Seleziona agenzia'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as 'agent' | 'admin')}>
                <SelectTrigger>
                  <SelectValue>
                    {addRole === 'agent' ? 'Agente' : 'Admin'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
            <Button onClick={handleAddAccess} disabled={addLoading || !addUserId || !addWorkspaceId}>
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: New Workspace */}
      <Dialog open={newWsOpen} onOpenChange={(o) => { setNewWsOpen(o); if (!o) setNewWsName('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea nuova agenzia</DialogTitle>
            <DialogDescription>
              La nuova agenzia verrà aggiunta al gruppo con piano network. Potrai invitare agenti in seguito.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nome agenzia</Label>
            <Input
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Es. Immobiliare Roma Sud"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewWsOpen(false)}>Annulla</Button>
            <Button onClick={handleCreateWorkspace} disabled={newWsLoading || !newWsName.trim()}>
              {newWsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea agenzia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirm Remove */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rimuovi accesso</DialogTitle>
            <DialogDescription>
              Rimuovi l&apos;accesso di <strong>{removeTarget?.name}</strong> all&apos;agenzia <strong>{removeTarget?.ws}</strong>?
              L&apos;utente non potrà più accedere a questa agenzia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleRemoveAccess} disabled={removeLoading}>
              {removeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rimuovi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
