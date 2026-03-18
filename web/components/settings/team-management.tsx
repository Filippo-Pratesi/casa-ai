'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,

  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserPlus, MoreHorizontal, Trash2, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

interface Props {
  members: Member[]
  currentUserId: string
  currentRole: string
}

const ROLE_LABELS: Record<string, string> = {
  group_admin: 'Admin Gruppo',
  admin: 'Admin',
  agent: 'Agente',
}

const ROLE_COLORS: Record<string, string> = {
  group_admin: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  agent: 'bg-muted text-muted-foreground border-border',
}

export function TeamManagement({ members, currentUserId, currentRole }: Props) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'agent' | 'admin'>('agent')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isGroupAdmin = currentRole === 'group_admin'

  async function handleInvite() {
    if (!inviteEmail || !inviteName) return
    setInviteLoading(true)
    setInviteError(null)
    const res = await fetch('/api/workspace/members/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
    })
    const data = await res.json()
    setInviteLoading(false)
    if (!res.ok) {
      setInviteError(data.error ?? 'Errore sconosciuto')
      return
    }
    setInviteOpen(false)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('agent')
    router.refresh()
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Rimuovere questo membro dal workspace?')) return
    setActionLoading(memberId)
    await fetch(`/api/workspace/members/${memberId}`, { method: 'DELETE' })
    setActionLoading(null)
    router.refresh()
  }

  async function handleRoleChange(memberId: string, role: 'admin' | 'agent') {
    setActionLoading(memberId + role)
    await fetch(`/api/workspace/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setActionLoading(null)
    router.refresh()
  }

  function canEdit(member: Member): boolean {
    if (member.id === currentUserId) return false
    if (member.role === 'group_admin') return false
    if (member.role === 'admin' && !isGroupAdmin) return false
    return true
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{members.length} membri nel workspace</p>
        <button
          className="btn-ai gap-1.5 !px-3 !py-1.5 !text-xs !rounded-lg"
          onClick={() => setInviteOpen(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Aggiungi membro
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3 bg-card">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[oklch(0.57_0.20_33)] text-white text-xs font-semibold">
              {member.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="ml-1.5 text-muted-foreground font-normal">(tu)</span>
                  )}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[member.role]}`}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
            </div>

            {/* Actions */}
            {canEdit(member) && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors">
                  {actionLoading?.startsWith(member.id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {isGroupAdmin && member.role === 'agent' && (
                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'admin')}>
                      <ShieldCheck className="h-3.5 w-3.5 mr-2 text-purple-600" />
                      Promuovi ad Admin
                    </DropdownMenuItem>
                  )}
                  {isGroupAdmin && member.role === 'admin' && (
                    <DropdownMenuItem onClick={() => handleRoleChange(member.id, 'agent')}>
                      <ShieldOff className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      Declassa ad Agente
                    </DropdownMenuItem>
                  )}
                  {isGroupAdmin && (member.role === 'agent' || member.role === 'admin') && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => handleRemove(member.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Rimuovi dal team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi membro al team</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Nome completo</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Mario Rossi"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="mario@agenzia.it"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
              />
            </div>
            {isGroupAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Ruolo</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'agent' | 'admin')}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
                >
                  <option value="agent">Agente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            {inviteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>
            )}
          </div>

          <DialogFooter>
            <button onClick={() => setInviteOpen(false)} disabled={inviteLoading} className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60">
              Annulla
            </button>
            <button onClick={handleInvite} disabled={inviteLoading || !inviteEmail || !inviteName} className="btn-ai gap-2 disabled:opacity-60">
              {inviteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {inviteLoading ? 'Invio...' : 'Invia invito'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
