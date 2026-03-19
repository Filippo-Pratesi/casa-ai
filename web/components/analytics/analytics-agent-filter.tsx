'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

interface Props {
  agents: { id: string; name: string }[]
  selectedAgentId: string
}

export function AnalyticsAgentFilter({ agents, selectedAgentId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'all') {
      params.delete('agent_id')
    } else {
      params.set('agent_id', value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const selectedName = agents.find(a => a.id === selectedAgentId)?.name

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select value={selectedAgentId || 'all'} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] text-sm">
          <span className="truncate">{selectedName ?? 'Tutti gli agenti'}</span>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="all">Tutti gli agenti</SelectItem>
          {agents.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
