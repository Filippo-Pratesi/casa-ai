'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, Building2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Workspace } from '@/lib/supabase/types'

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  activeWorkspaceId: string
  groupName: string
}

export function WorkspaceSwitcher({ workspaces, activeWorkspaceId, groupName }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0]

  async function switchTo(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return
    setLoading(true)
    await fetch('/api/workspace/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 hover:bg-neutral-100 transition-colors text-left"
        disabled={loading}
        render={<button />}
      >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white text-xs font-bold">
            {active?.name.slice(0, 2).toUpperCase() ?? 'CA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 leading-tight truncate">{active?.name}</p>
            <p className="text-[11px] text-neutral-400 truncate leading-tight">{groupName}</p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">{groupName}</p>
        </div>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id} onClick={() => switchTo(ws.id)} className="gap-2">
            <Building2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span className="flex-1 truncate">{ws.name}</span>
            {ws.id === activeWorkspaceId && <Check className="h-3.5 w-3.5 text-neutral-700 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
