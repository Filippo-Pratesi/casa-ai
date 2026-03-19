import { cn } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  buyer: {
    label: 'Acquirente',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  seller: {
    label: 'Venditore',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  renter: {
    label: 'Affittuario',
    color: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
  landlord: {
    label: 'Proprietario',
    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  },
  other: {
    label: 'Altro',
    color: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
}

interface ContactTypeBadgesProps {
  types?: string[] | null
  /** Fallback single type if types array is empty */
  type?: string | null
  className?: string
  size?: 'xs' | 'sm'
}

export function ContactTypeBadges({ types, type, className, size = 'xs' }: ContactTypeBadgesProps) {
  // Resolve the list to display
  const list: string[] = (types && types.length > 0)
    ? types
    : type ? [type] : []

  if (list.length === 0) return null

  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs'
  const padding = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {list.map((t) => {
        const cfg = TYPE_CONFIG[t] ?? TYPE_CONFIG.other
        return (
          <span
            key={t}
            className={cn(
              'rounded-full border font-medium',
              textSize,
              padding,
              cfg.color,
            )}
          >
            {cfg.label}
          </span>
        )
      })}
    </div>
  )
}
