'use client'

import { Clock, Send, CheckCircle, XCircle, AlertCircle, ArrowLeftRight, Undo } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProposalStatus = 'bozza' | 'inviata' | 'accettata' | 'rifiutata' | 'scaduta' | 'controproposta' | 'ritirata'

const statusConfig: Record<ProposalStatus, {
  label: string
  icon: React.ElementType
  className: string
}> = {
  bozza: {
    label: 'Bozza',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  inviata: {
    label: 'Inviata',
    icon: Send,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  accettata: {
    label: 'Accettata',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  rifiutata: {
    label: 'Rifiutata',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  scaduta: {
    label: 'Scaduta',
    icon: AlertCircle,
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  controproposta: {
    label: 'Controproposta',
    icon: ArrowLeftRight,
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  ritirata: {
    label: 'Ritirata',
    icon: Undo,
    className: 'bg-muted text-muted-foreground',
  },
}

interface ProposalStatusBadgeProps {
  status: ProposalStatus
  className?: string
}

export function ProposalStatusBadge({ status, className }: ProposalStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      config.className,
      className
    )}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
