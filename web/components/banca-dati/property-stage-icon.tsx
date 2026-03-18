'use client'

import { cn } from '@/lib/utils'
import { Eye, EyeOff, User, FileText, CheckCircle, Home, RefreshCw, HelpCircle } from 'lucide-react'

export type PropertyStage =
  | 'sconosciuto'
  | 'ignoto'
  | 'conosciuto'
  | 'incarico'
  | 'venduto'
  | 'locato'
  | 'disponibile'

const STAGE_CONFIG: Record<PropertyStage, {
  label: string
  icon: React.ElementType
  color: string
  bg: string
}> = {
  sconosciuto: {
    label: 'Sconosciuto',
    icon: HelpCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
  ignoto: {
    label: 'Ignoto',
    icon: EyeOff,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
  conosciuto: {
    label: 'Conosciuto',
    icon: Eye,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
  },
  incarico: {
    label: 'Incarico',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
  },
  venduto: {
    label: 'Venduto',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
  },
  locato: {
    label: 'Locato',
    icon: Home,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
  },
  disponibile: {
    label: 'Disponibile',
    icon: RefreshCw,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950',
  },
}

interface PropertyStageIconProps {
  stage: PropertyStage
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PropertyStageIcon({ stage, showLabel = false, size = 'sm', className }: PropertyStageIconProps) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.sconosciuto
  const Icon = config.icon

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
  const padding = size === 'sm' ? 'px-2 py-0.5' : size === 'md' ? 'px-2.5 py-1' : 'px-3 py-1.5'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bg,
        config.color,
        padding,
        textSize,
        className
      )}
    >
      <Icon className={cn(iconSize, 'shrink-0')} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

export function PropertyStageBadge({ stage, className }: { stage: PropertyStage; className?: string }) {
  return <PropertyStageIcon stage={stage} showLabel size="sm" className={className} />
}

export { STAGE_CONFIG }
