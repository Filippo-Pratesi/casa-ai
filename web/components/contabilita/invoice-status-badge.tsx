'use client'

import { Clock, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InvoiceStatus = 'bozza' | 'inviata' | 'pagata' | 'scaduta'

const statusConfig: Record<InvoiceStatus, {
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
  pagata: {
    label: 'Pagata',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  scaduta: {
    label: 'Scaduta',
    icon: AlertCircle,
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
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
