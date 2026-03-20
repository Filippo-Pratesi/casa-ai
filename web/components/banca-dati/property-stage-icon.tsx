'use client'

import { cn } from '@/lib/utils'
import { Eye, EyeOff, FileText, CheckCircle, Home, HelpCircle } from 'lucide-react'
import { STAGE_LABELS } from '@/lib/constants/property-stages'

export type PropertyStage =
  | 'sconosciuto'
  | 'ignoto'
  | 'conosciuto'
  | 'incarico'
  | 'venduto'
  | 'locato'

const STAGE_CONFIG: Record<PropertyStage, {
  label: string
  icon: React.ElementType
  color: string
  bg: string
  description: string
}> = {
  sconosciuto: {
    label: STAGE_LABELS.sconosciuto,
    icon: HelpCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800',
    description: 'Solo indirizzo noto, nessun contatto',
  },
  ignoto: {
    label: STAGE_LABELS.ignoto,
    icon: EyeOff,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    description: 'Informazioni presenti, proprietario non contattato',
  },
  conosciuto: {
    label: STAGE_LABELS.conosciuto,
    icon: Eye,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    description: 'Contatto con il proprietario attivato',
  },
  incarico: {
    label: STAGE_LABELS.incarico,
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950',
    description: 'Mandato di vendita o locazione firmato',
  },
  venduto: {
    label: STAGE_LABELS.venduto,
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    description: 'Rogito completato, vendita conclusa',
  },
  locato: {
    label: STAGE_LABELS.locato,
    icon: Home,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950',
    description: 'Contratto di locazione attivo',
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
      title={config.description}
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
