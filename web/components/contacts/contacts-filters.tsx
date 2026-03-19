'use client'

import React from 'react'
import { Search, Euro, ArrowUpDown, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  seller: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  renter: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  other: 'bg-muted text-muted-foreground border-border',
}

const TYPE_ACTIVE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-600 text-white border-blue-600',
  seller: 'bg-green-600 text-white border-green-600',
  renter: 'bg-purple-600 text-white border-purple-600',
  landlord: 'bg-amber-500 text-white border-amber-500',
  other: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
}

export type SortKey = 'date_desc' | 'date_asc' | 'budget_desc' | 'budget_asc'

interface ContactsFiltersProps {
  activeTypes: Set<string>
  citySearch: string
  budgetMax: string
  sortBy: SortKey
  onToggleType: (type: string) => void
  onCitySearchChange: (value: string) => void
  onBudgetMaxChange: (value: string) => void
  onSortByChange: (value: SortKey) => void
  onClearFilters: () => void
}

export const ContactsFilters = React.memo(function ContactsFilters({
  activeTypes,
  citySearch,
  budgetMax,
  sortBy,
  onToggleType,
  onCitySearchChange,
  onBudgetMaxChange,
  onSortByChange,
  onClearFilters,
}: ContactsFiltersProps) {
  const { t } = useI18n()

  const TYPE_LABELS: Record<string, string> = {
    buyer: t('contacts.type.buyer'),
    seller: t('contacts.type.seller'),
    renter: t('contacts.type.renter'),
    landlord: t('contacts.type.landlord'),
    other: t('contacts.type.other'),
  }

  const hasFilters = activeTypes.size > 0 || citySearch.trim() || budgetMax

  return (
    <div className="animate-in-2 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(TYPE_LABELS).map(([key, label]) => {
          const active = activeTypes.has(key)
          return (
            <button
              key={key}
              onClick={() => onToggleType(key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${active ? TYPE_ACTIVE_COLORS[key] : TYPE_COLORS[key] + ' hover:opacity-80'}`}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={citySearch}
            onChange={e => onCitySearchChange(e.target.value)}
            placeholder={t('contacts.filter.searchPlaceholder')}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm placeholder-muted-foreground"
          />
        </div>
        <div className="relative min-w-[140px]">
          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="number"
            value={budgetMax}
            onChange={e => onBudgetMaxChange(e.target.value)}
            placeholder={t('contacts.filter.budgetMax')}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm placeholder-muted-foreground"
          />
        </div>
        <div className="relative min-w-[160px]">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value as SortKey)}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground appearance-none cursor-pointer"
          >
            <option value="date_desc">Più recenti</option>
            <option value="date_asc">Meno recenti</option>
            <option value="budget_desc">Budget alto</option>
            <option value="budget_asc">Budget basso</option>
          </select>
        </div>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            {t('contacts.filter.clear')}
          </button>
        )}
      </div>
    </div>
  )
})
