'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlusSquare, FileText, Euro, Maximize2, Home, User, Users, CalendarDays, TrendingUp, LayoutGrid, List, Search, X, Download } from 'lucide-react'

const TONE_LABELS: Record<string, string> = {
  standard: 'Standard',
  luxury: 'Luxury',
  approachable: 'Accessibile',
  investment: 'Investimento',
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartamento',
  house: 'Casa',
  villa: 'Villa',
  commercial: 'Commerciale',
  land: 'Terreno',
  garage: 'Garage',
  other: 'Altro',
}

const TYPE_COLORS: Record<string, string> = {
  apartment: 'bg-blue-50 text-blue-700 border-blue-100',
  house: 'bg-green-50 text-green-700 border-green-100',
  villa: 'bg-purple-50 text-purple-700 border-purple-100',
  commercial: 'bg-orange-50 text-orange-700 border-orange-100',
  land: 'bg-amber-50 text-amber-700 border-amber-100',
  garage: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  other: 'bg-neutral-50 text-neutral-600 border-neutral-200',
}

const TYPE_ACTIVE: Record<string, string> = {
  apartment: 'bg-blue-600 text-white border-blue-600',
  house: 'bg-green-600 text-white border-green-600',
  villa: 'bg-purple-600 text-white border-purple-600',
  commercial: 'bg-orange-600 text-white border-orange-600',
  land: 'bg-amber-500 text-white border-amber-500',
  garage: 'bg-neutral-700 text-white border-neutral-700',
  other: 'bg-neutral-700 text-white border-neutral-700',
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

function downloadCSV(listings: Listing[]) {
  const headers = ['Indirizzo', 'Città', 'Tipo', 'Prezzo (€)', 'mq', 'Locali', 'Agente', 'Contenuto AI', 'Data']
  const rows = listings.map(l => [
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

export function DashboardClient({ listings, stats, isAdmin }: DashboardClientProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [citySearch, setCitySearch] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [contentFilter, setContentFilter] = useState<'all' | 'generated' | 'draft'>('all')

  function toggleType(t: string) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
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
    return listings.filter(l => {
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
  }, [listings, activeTypes, citySearch, priceMax, contentFilter])

  const statCards = [
    { label: 'Annunci attivi', value: stats.listings, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Clienti', value: stats.contacts, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'App. imminenti', value: stats.appointments, icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Contenuto AI', value: stats.aiContent, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Annunci</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {filtered.length !== listings.length
              ? `${filtered.length} di ${listings.length} annunci`
              : `${listings.length} annunci nel workspace`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              title="Vista card"
              className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Vista lista"
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => downloadCSV(filtered)}
              title="Esporta CSV"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Esporta
            </button>
          )}
          <Button nativeButton={false} render={<Link href="/listing/new" />} className="gap-2 shadow-sm">
            <PlusSquare className="h-4 w-4" />
            Nuovo annuncio
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className={`mb-3 inline-flex rounded-xl p-2 ${s.bg}`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-neutral-900 leading-none">{s.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      {listings.length > 0 && (
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 space-y-3 shadow-sm">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const active = activeTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${active ? TYPE_ACTIVE[key] : (TYPE_COLORS[key] ?? 'bg-neutral-50 text-neutral-600 border-neutral-200') + ' hover:opacity-80'}`}
                >
                  {label}
                </button>
              )
            })}
            {/* Content status filter */}
            <div className="ml-auto flex rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden text-xs">
              {([['all', 'Tutti'], ['generated', 'Con AI'], ['draft', 'Bozze']] as [typeof contentFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setContentFilter(val)}
                  className={`px-2.5 py-1 font-medium transition-colors ${contentFilter === val ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search + price */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder="Cerca indirizzo o città…"
                className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="number"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                placeholder="Prezzo max (€)"
                className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <FileText className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">Nessun annuncio ancora</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">
            Crea il primo annuncio e genera descrizioni, post social e molto altro in pochi secondi.
          </p>
          <Button nativeButton={false} render={<Link href="/listing/new" />} className="mt-6 gap-2">
            <PlusSquare className="h-4 w-4" />
            Crea il primo annuncio
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
          <Search className="h-8 w-8 text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-500">Nessun annuncio corrisponde ai filtri</p>
          <button onClick={clearFilters} className="mt-2 text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors">
            Rimuovi filtri
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* Card grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_90px_90px_70px_90px] gap-2 px-4 py-2.5 border-b border-neutral-100 bg-neutral-50">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Immobile</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tipo</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">Prezzo</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">mq / loc.</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">AI</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Data</p>
          </div>
          <div className="divide-y divide-neutral-50">
            {filtered.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ListingCard({ listing: l }: { listing: Listing }) {
  const thumb = Array.isArray(l.photos_urls) && l.photos_urls.length > 0 ? l.photos_urls[0] : null

  return (
    <Link href={`/listing/${l.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-neutral-200">
        <div className="relative h-44 w-full bg-neutral-100">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={l.address} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Home className="h-10 w-10 text-neutral-300" />
            </div>
          )}
          <div className="absolute top-2.5 right-2.5">
            {l.generated_content ? (
              <span className="inline-flex items-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white shadow">AI</span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-neutral-800/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">Bozza</span>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-neutral-900 truncate text-sm leading-snug">{l.address}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {TYPE_LABELS[l.property_type]} · {l.city}
              {l.property_type === 'apartment' && l.floor != null ? ` · Piano ${l.floor}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span className="flex items-center gap-1 font-medium">
              <Euro className="h-3 w-3 text-neutral-400" />
              {l.price.toLocaleString('it-IT')}
            </span>
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3 text-neutral-400" />
              {l.sqm} m²
            </span>
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3 text-neutral-400" />
              {l.rooms} loc.
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-neutral-500">
              <User className="h-3 w-3" />
              {l.agent?.name ?? '—'}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{TONE_LABELS[l.tone]}</Badge>
              <span className="text-[11px] text-neutral-400">{formatDate(l.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ListingRow({ listing: l }: { listing: Listing }) {
  return (
    <Link
      href={`/listing/${l.id}`}
      className="grid grid-cols-[1fr_100px_90px_90px_70px_90px] gap-2 items-center px-4 py-3 hover:bg-neutral-50 transition-colors group"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-neutral-700">{l.address}</p>
        <p className="text-xs text-neutral-400 truncate">{l.city}</p>
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TYPE_COLORS[l.property_type] ?? 'bg-neutral-50 text-neutral-600 border-neutral-200'}`}>
        {TYPE_LABELS[l.property_type]}
      </span>
      <p className="text-xs font-medium text-neutral-800 text-right">€{l.price.toLocaleString('it-IT')}</p>
      <p className="text-xs text-neutral-500 text-right">{l.sqm} m² · {l.rooms} loc.</p>
      <span>
        {l.generated_content
          ? <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-medium">Sì</span>
          : <span className="rounded-full bg-neutral-100 text-neutral-400 px-2 py-0.5 text-[10px] font-medium">No</span>
        }
      </span>
      <p className="text-xs text-neutral-400">{formatDate(l.created_at)}</p>
    </Link>
  )
}
