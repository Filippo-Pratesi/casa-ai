'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Building2, User, Calendar, FileText, Receipt,
  RefreshCw, AlertCircle, Loader2, Settings, X, Check,
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

// Feed visibility settings — which sources to show
type FeedSettings = Record<FeedSource, boolean>

const DEFAULT_SETTINGS: FeedSettings = {
  property_event: true,
  contact_event: true,
  appointment: true,
  proposal: true,
  invoice: true,
}

const SETTINGS_KEY = 'casa-ai:feed-settings'

function loadSettings(): FeedSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<FeedSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: FeedSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // ignore
  }
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

// Settings panel labels (more descriptive than SOURCE_LABELS)
const SETTINGS_LABELS: Record<FeedSource, string> = {
  property_event: 'Cronistoria immobili',
  contact_event: 'Cronistoria contatti',
  appointment: 'Appuntamenti',
  proposal: 'Proposte d\'acquisto',
  invoice: 'Fatture',
}

function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: FeedSettings
  onChange: (s: FeedSettings) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  function toggle(source: FeedSource) {
    const updated = { ...settings, [source]: !settings[source] }
    onChange(updated)
    saveSettings(updated)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-64 rounded-xl border border-border bg-card shadow-xl py-2"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mostra nel feed
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="py-1">
        {(Object.entries(SETTINGS_LABELS) as Array<[FeedSource, string]>).map(([source, label]) => (
          <button
            key={source}
            onClick={() => toggle(source)}
            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
          >
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1',
              SOURCE_COLORS[source]
            )}>
              <IconForSource source={source} />
            </div>
            <span className="flex-1 text-left text-sm text-foreground">{label}</span>
            <div className={cn(
              'flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors',
              settings[source]
                ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)]'
                : 'border-border bg-background'
            )}>
              {settings[source] && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FeedSource | 'all'>('all')
  const [settings, setSettings] = useState<FeedSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings())
  }, [])

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

  // Apply both active filter and visibility settings
  const filtered = feed.filter(item => {
    if (!settings[item.source]) return false
    if (activeFilter === 'all') return true
    return item.source === activeFilter
  })

  const groups = groupByDay(filtered)

  return (
    <div className="space-y-4">
      {/* Filter pills + controls */}
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
                <span className="ml-1.5 opacity-50 tabular-nums">
                  {feed.filter(i => i.source === f.key && settings[i.source]).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right controls: refresh + settings */}
        <div className="flex items-center gap-1">
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

          {/* Settings gear */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(v => !v)}
              className={cn(
                'h-8 w-8 p-0 text-muted-foreground',
                showSettings && 'bg-muted text-foreground'
              )}
              title="Impostazioni feed"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {showSettings && (
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </div>
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
