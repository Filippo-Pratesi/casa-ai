'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, User, Calendar, FileText, Receipt,
  RefreshCw, AlertCircle, Loader2,
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type FeedSource = 'property_event' | 'contact_event' | 'appointment' | 'proposal' | 'invoice'

interface FeedItem {
  id: string
  source: FeedSource
  icon: string
  title: string
  subtitle?: string
  href: string
  timestamp: string
}

const SOURCE_LABELS: Record<FeedSource, string> = {
  property_event: 'Immobili',
  contact_event: 'Contatti',
  appointment: 'Appuntamenti',
  proposal: 'Proposte',
  invoice: 'Fatture',
}

const SOURCE_FILTERS: Array<{ key: FeedSource | 'all'; label: string }> = [
  { key: 'all', label: 'Tutti' },
  { key: 'property_event', label: 'Immobili' },
  { key: 'contact_event', label: 'Contatti' },
  { key: 'appointment', label: 'Appuntamenti' },
  { key: 'proposal', label: 'Proposte' },
  { key: 'invoice', label: 'Fatture' },
]

const SOURCE_COLORS: Record<FeedSource, string> = {
  property_event: 'bg-[oklch(0.94_0.055_250)] text-[oklch(0.50_0.17_250)] ring-[oklch(0.50_0.17_250/0.2)]',
  contact_event: 'bg-[oklch(0.94_0.05_188)] text-[oklch(0.55_0.14_188)] ring-[oklch(0.55_0.14_188/0.2)]',
  appointment: 'bg-[oklch(0.94_0.055_290)] text-[oklch(0.55_0.17_290)] ring-[oklch(0.55_0.17_290/0.2)]',
  proposal: 'bg-[oklch(0.95_0.055_33)] text-[oklch(0.57_0.20_33)] ring-[oklch(0.57_0.20_33/0.2)]',
  invoice: 'bg-[oklch(0.96_0.055_75)] text-[oklch(0.60_0.14_68)] ring-[oklch(0.60_0.14_68/0.2)]',
}

function IconForSource({ source }: { source: FeedSource }) {
  const cls = 'h-3.5 w-3.5'
  switch (source) {
    case 'property_event': return <Building2 className={cls} />
    case 'contact_event': return <User className={cls} />
    case 'appointment': return <Calendar className={cls} />
    case 'proposal': return <FileText className={cls} />
    case 'invoice': return <Receipt className={cls} />
  }
}

function groupByDay(items: FeedItem[]): Array<{ label: string; items: FeedItem[] }> {
  const groups: Map<string, FeedItem[]> = new Map()

  for (const item of items) {
    const d = new Date(item.timestamp)
    let label: string
    if (isToday(d)) {
      label = 'Oggi'
    } else if (isYesterday(d)) {
      label = 'Ieri'
    } else {
      label = format(d, 'd MMMM yyyy', { locale: it })
    }
    const existing = groups.get(label)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(label, [item])
    }
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
}

function FeedItemRow({ item }: { item: FeedItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 hover:bg-muted/60"
    >
      {/* Icon */}
      <div className={cn(
        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1',
        SOURCE_COLORS[item.source]
      )}>
        <IconForSource source={item.source} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug text-foreground group-hover:text-[oklch(0.57_0.20_33)] transition-colors">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground capitalize">
            {item.subtitle}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <time
        className="shrink-0 text-[10px] text-muted-foreground/70 mt-0.5 tabular-nums"
        title={format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm')}
      >
        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: it })}
      </time>
    </Link>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-2.5">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FeedSource | 'all'>('all')

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/activity-feed')
      if (!res.ok) throw new Error('Errore nel caricamento del feed')
      const data = await res.json()
      setFeed(data.feed ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  const filtered = activeFilter === 'all'
    ? feed
    : feed.filter(item => item.source === activeFilter)

  const groups = groupByDay(filtered)

  return (
    <div className="space-y-4">
      {/* Filter pills + refresh */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
                activeFilter === f.key
                  ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
                  : 'bg-muted text-muted-foreground border-border hover:opacity-80'
              )}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 opacity-60">
                  ({feed.filter(i => i.source === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchFeed}
          disabled={loading}
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Aggiorna
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchFeed} className="mt-3 h-8 text-xs">
            Riprova
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {activeFilter === 'all'
              ? 'Nessuna attività recente.'
              : `Nessuna attività per ${SOURCE_LABELS[activeFilter as FeedSource]}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              {/* Day header */}
              <div className="sticky top-0 z-10 -mx-1 mb-1 flex items-center gap-2 bg-background/80 px-1 py-1 backdrop-blur-sm">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </span>
                <div className="flex-1 border-t border-border/50" />
                <span className="text-[10px] text-muted-foreground/50">{group.items.length}</span>
              </div>

              {/* Items */}
              <div className="-mx-3 space-y-0.5">
                {group.items.map(item => (
                  <FeedItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
