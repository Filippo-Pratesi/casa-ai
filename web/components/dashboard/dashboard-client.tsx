'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusSquare, FileText, Euro, Maximize2, Home, User, Users, CalendarDays, TrendingUp, LayoutGrid, List, Search, X, Download, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

const TYPE_COLORS: Record<string, string> = {
  apartment: 'bg-blue-50 text-blue-700 border-blue-100',
  house: 'bg-green-50 text-green-700 border-green-100',
  villa: 'bg-purple-50 text-purple-700 border-purple-100',
  commercial: 'bg-orange-50 text-orange-700 border-orange-100',
  land: 'bg-amber-50 text-amber-700 border-amber-100',
  garage: 'bg-muted text-muted-foreground border-border',
  other: 'bg-muted text-muted-foreground border-border',
}

const TYPE_ACTIVE: Record<string, string> = {
  apartment: 'bg-blue-600 text-white border-blue-600',
  house: 'bg-green-600 text-white border-green-600',
  villa: 'bg-purple-600 text-white border-purple-600',
  commercial: 'bg-orange-600 text-white border-orange-600',
  land: 'bg-amber-500 text-white border-amber-500',
  garage: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
  other: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
}

interface Listing {
  id: string
  address: string
  city: string
  price: number
  sqm: number
  rooms: number
  property_type: string
  tone: string
  floor: number | null
  photos_urls: string[] | null
  generated_content: unknown
  created_at: string
  agent: { name: string } | null
}

interface Stats {
  listings: number
  contacts: number
  appointments: number
  aiContent: number
}

interface DashboardClientProps {
  listings: Listing[]
  stats: Stats
  isAdmin: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DashboardClient({ listings, stats, isAdmin }: DashboardClientProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [citySearch, setCitySearch] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [contentFilter, setContentFilter] = useState<'all' | 'generated' | 'draft'>('all')
  const [sortKey, setSortKey] = useState<'address' | 'price' | 'sqm' | 'date' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const TYPE_LABELS: Record<string, string> = useMemo(() => ({
    apartment: t('property.apartment'),
    house: t('property.house'),
    villa: t('property.villa'),
    commercial: t('property.commercial'),
    land: t('property.land'),
    garage: t('property.garage'),
    other: t('property.other'),
  }), [t])

  function downloadCSV(data: Listing[]) {
    const headers = [t('listings.col.property'), t('listings.col.type'), `${t('listings.col.price')} (€)`, 'mq', t('common.rooms'), 'Agente', 'AI', t('listings.col.date')]
    const rows = data.map(l => [
      l.address,
      l.city,
      TYPE_LABELS[l.property_type] ?? l.property_type,
      l.price,
      l.sqm,
      l.rooms,
      l.agent?.name ?? '',
      l.generated_content ? 'Sì' : 'No',
      formatDate(l.created_at),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `annunci_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function toggleType(type: string) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const hasFilters = activeTypes.size > 0 || citySearch.trim() || priceMax || contentFilter !== 'all'

  function clearFilters() {
    setActiveTypes(new Set())
    setCitySearch('')
    setPriceMax('')
    setContentFilter('all')
  }

  const filtered = useMemo(() => {
    const base = listings.filter(l => {
      if (activeTypes.size > 0 && !activeTypes.has(l.property_type)) return false
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase()
        if (!l.city.toLowerCase().includes(q) && !l.address.toLowerCase().includes(q)) return false
      }
      if (priceMax) {
        const max = Number(priceMax)
        if (!isNaN(max) && l.price > max) return false
      }
      if (contentFilter === 'generated' && !l.generated_content) return false
      if (contentFilter === 'draft' && l.generated_content) return false
      return true
    })
    if (!sortKey) return base
    return [...base].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'address') cmp = a.address.localeCompare(b.address)
      else if (sortKey === 'price') cmp = a.price - b.price
      else if (sortKey === 'sqm') cmp = a.sqm - b.sqm
      else if (sortKey === 'date') cmp = a.created_at.localeCompare(b.created_at)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [listings, activeTypes, citySearch, priceMax, contentFilter, sortKey, sortDir])

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  const statCards = [
    {
      label: 'Annunci attivi',
      value: stats.listings,
      icon: Home,
      gradient: 'from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)]',
      glow: 'shadow-[oklch(0.57_0.20_33/0.25)]',
      bg: 'from-[oklch(0.95_0.055_33)] to-[oklch(0.97_0.02_45)]',
      iconColor: 'text-[oklch(0.57_0.20_33)]',
    },
    {
      label: t('contacts.title'),
      value: stats.contacts,
      icon: Users,
      gradient: 'from-[oklch(0.66_0.15_188)] to-[oklch(0.55_0.14_200)]',
      glow: 'shadow-[oklch(0.66_0.15_188/0.25)]',
      bg: 'from-[oklch(0.94_0.05_188)] to-[oklch(0.96_0.02_195)]',
      iconColor: 'text-[oklch(0.55_0.14_188)]',
    },
    {
      label: 'App. imminenti',
      value: stats.appointments,
      icon: CalendarDays,
      gradient: 'from-[oklch(0.60_0.18_290)] to-[oklch(0.50_0.17_305)]',
      glow: 'shadow-[oklch(0.60_0.18_290/0.25)]',
      bg: 'from-[oklch(0.94_0.055_290)] to-[oklch(0.96_0.025_300)]',
      iconColor: 'text-[oklch(0.55_0.17_290)]',
    },
    {
      label: 'Contenuto AI',
      value: stats.aiContent,
      icon: TrendingUp,
      gradient: 'from-[oklch(0.76_0.14_75)] to-[oklch(0.65_0.14_60)]',
      glow: 'shadow-[oklch(0.76_0.14_75/0.25)]',
      bg: 'from-[oklch(0.96_0.055_75)] to-[oklch(0.97_0.025_65)]',
      iconColor: 'text-[oklch(0.60_0.14_68)]',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-in-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('listings.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length !== listings.length
              ? `${filtered.length} ${t('listings.subtitleFiltered')} ${listings.length} ${t('listings.subtitle')}`
              : `${listings.length} ${t('listings.subtitle')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              title={t('common.viewCard')}
              className={`p-2 transition-all duration-200 ${viewMode === 'card' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title={t('common.viewList')}
              className={`p-2 transition-all duration-200 ${viewMode === 'list' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => downloadCSV(filtered)}
              title={t('listings.export')}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-all duration-200"
            >
              <Download className="h-3.5 w-3.5" />
              {t('listings.export')}
            </button>
          )}
          <Link
            href="/listing/new"
            className="btn-ai flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <PlusSquare className="h-4 w-4" />
            {t('listings.new')}
          </Link>
        </div>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s, i) => (
          <div
            key={s.label}
            className={`animate-in-${i + 2} relative overflow-hidden rounded-2xl border border-border bg-card p-4 card-lift`}
          >
            {/* Subtle gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg} opacity-60`} />
            <div className="relative">
              <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${s.gradient} p-2 shadow-md ${s.glow}`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-2xl font-extrabold leading-none">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      {listings.length > 0 && (
        <div className="animate-in-3 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const active = activeTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${active ? TYPE_ACTIVE[key] : (TYPE_COLORS[key] ?? 'bg-muted text-muted-foreground border-border') + ' hover:opacity-80'}`}
                >
                  {label}
                </button>
              )
            })}
            {/* Content status filter */}
            <div className="ml-auto flex rounded-lg border border-border bg-card overflow-hidden text-xs">
              {([['all', t('listings.filter.all')], ['generated', t('listings.filter.withAI')], ['draft', t('listings.filter.drafts')]] as [typeof contentFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setContentFilter(val)}
                  className={`px-2.5 py-1 font-medium transition-colors ${contentFilter === val ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search + price */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder={t('listings.filter.searchPlaceholder')}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder={t('listings.filter.priceMax')}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                {t('listings.filter.clear')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border mesh-bg py-20 text-center animate-in-4">
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] p-4 shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-base font-bold">{t('listings.empty.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {t('listings.empty.body')}
          </p>
          <Link href="/listing/new" className="btn-ai mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
            <PlusSquare className="h-4 w-4" />
            {t('listings.empty.cta')}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('listings.noResults')}</p>
          <button onClick={clearFilters} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            {t('listings.filter.clear')}
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* Card grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} typeLabels={TYPE_LABELS} />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-in-4">
          <div className="grid grid-cols-[1fr_100px_90px_90px_70px_90px] gap-2 px-4 py-2 border-b border-border bg-muted/50">
            <button onClick={() => handleSort('address')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              {t('listings.col.property')}<SortIcon col="address" />
            </button>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('listings.col.type')}</p>
            <button onClick={() => handleSort('price')} className="flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
              {t('listings.col.price')}<SortIcon col="price" />
            </button>
            <button onClick={() => handleSort('sqm')} className="flex items-center justify-end gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full">
              {t('listings.col.sqmRooms')}<SortIcon col="sqm" />
            </button>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('listings.col.ai')}</p>
            <button onClick={() => handleSort('date')} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              {t('listings.col.date')}<SortIcon col="date" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {filtered.map((l) => (
              <ListingRow key={l.id} listing={l} typeLabels={TYPE_LABELS} draftLabel={t('listings.badge.draft')} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ListingCard({ listing: l, typeLabels }: { listing: Listing; typeLabels: Record<string, string> }) {
  const { t } = useI18n()
  const thumb = Array.isArray(l.photos_urls) && l.photos_urls.length > 0 ? l.photos_urls[0] : null

  return (
    <Link href={`/listing/${l.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm card-lift">
        {/* Image area */}
        <div className="relative h-48 w-full bg-muted overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={l.address} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center mesh-bg">
              <Home className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Floating price badge */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-xl bg-black/50 backdrop-blur-md px-3 py-1.5 text-sm font-bold text-white border border-white/10">
              €{l.price.toLocaleString('it-IT')}
            </span>
          </div>

          {/* AI / Draft badge */}
          <div className="absolute top-2.5 right-2.5">
            {l.generated_content ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg">
                ✦ AI
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/80 border border-white/10">
                {t('listings.badge.draft')}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          <div>
            <h3 className="font-bold truncate text-sm leading-snug">{l.address}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeLabels[l.property_type]} · {l.city}
              {l.property_type === 'apartment' && l.floor != null ? ` · Piano ${l.floor}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {l.sqm} m²
            </span>
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {l.rooms} {t('common.rooms')}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {l.agent?.name ?? '—'}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatDate(l.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ListingRow({ listing: l, typeLabels, draftLabel }: { listing: Listing; typeLabels: Record<string, string>; draftLabel: string }) {
  return (
    <Link
      href={`/listing/${l.id}`}
      className="grid grid-cols-[1fr_100px_90px_90px_70px_90px] gap-2 items-center px-4 py-3 hover:bg-muted/40 transition-all duration-150 group"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-[oklch(0.57_0.20_33)] transition-colors">{l.address}</p>
        <p className="text-xs text-muted-foreground truncate">{l.city}</p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TYPE_COLORS[l.property_type] ?? 'bg-muted text-muted-foreground border-border'}`}>
        {typeLabels[l.property_type]}
      </span>
      <p className="text-xs font-semibold text-right">€{l.price.toLocaleString('it-IT')}</p>
      <p className="text-xs text-muted-foreground text-right">{l.sqm} m² · {l.rooms}</p>
      <span>
        {l.generated_content
          ? <span className="rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.15)] text-[oklch(0.45_0.18_33)] px-2 py-0.5 text-[10px] font-semibold border border-[oklch(0.57_0.20_33/0.2)]">✦ AI</span>
          : <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">{draftLabel}</span>
        }
      </span>
      <p className="text-xs text-muted-foreground">{formatDate(l.created_at)}</p>
    </Link>
  )
}
