'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { CalendarIcon, X } from 'lucide-react'

interface ArchiveDateFilterProps {
  dateFrom: string
  dateTo: string
  filter: string
}

export function ArchiveDateFilter({ dateFrom, dateTo, filter }: ArchiveDateFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateUrl = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const hasDateFilter = !!(dateFrom || dateTo)

  function clearDates() {
    updateUrl({ date_from: '', date_to: '' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Dal</span>
        <input
          type="date"
          value={dateFrom}
          onChange={e => updateUrl({ date_from: e.target.value, filter })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[oklch(0.57_0.20_33/0.5)]"
        />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">al</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => updateUrl({ date_to: e.target.value, filter })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[oklch(0.57_0.20_33/0.5)]"
        />
      </div>
      {hasDateFilter && (
        <button
          onClick={clearDates}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
          Rimuovi date
        </button>
      )}
    </div>
  )
}
