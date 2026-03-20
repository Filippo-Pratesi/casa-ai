'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, X, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type PropertyCardData } from './property-card'
import { STAGE_CONFIG, type PropertyStage } from './property-stage-icon'
import { DISPOSITION_CONFIG } from './disposition-icon'
import { BancaDatiFilters } from './banca-dati-filters'
import { BancaDatiTable } from './banca-dati-table'

const STAGES: PropertyStage[] = ['sconosciuto', 'ignoto', 'conosciuto', 'incarico', 'venduto', 'locato']

const DEFAULT_WIDTHS: Record<string, number> = {
  city: 90, zone: 90, sub_zone: 70, street: 160, civic: 52,
  agent: 90, price: 80, owner: 110, stage: 90, disposition: 32,
  op: 60, type: 70, last_event: 160, updated: 70,
}

interface BancaDatiClientProps {
  properties: PropertyCardData[]
  total: number
  page: number
  perPage: number
  countByStage: Record<string, number>
  zonesWithCity: { name: string; city: string }[]
  cities: string[]
  agents: { id: string; name: string }[]
  isAdmin: boolean
  initialFilters: {
    stage: string
    city: string
    zone: string
    agent_id: string
    disposition: string
    transaction_type: string
    q: string
    sort: string
    viewMode: string
    street: string
    civic: string
  }
}

type ActivePill = { key: string; label: string; clear: Record<string, string> }

const SORT_OPTIONS = [
  { value: 'updated_at_desc', label: 'Recenti prima' },
  { value: 'updated_at_asc',  label: 'Meno recenti' },
  { value: 'city_asc',        label: 'Città A→Z' },
  { value: 'city_desc',       label: 'Città Z→A' },
  { value: 'value_desc',      label: 'Prezzo decrescente' },
  { value: 'value_asc',       label: 'Prezzo crescente' },
]
// SORT_OPTIONS kept for potential future use (e.g. a sort dropdown)
void SORT_OPTIONS

export function BancaDatiClient({
  properties,
  total,
  page,
  perPage,
  countByStage,
  zonesWithCity,
  cities,
  agents,
  isAdmin,
  initialFilters,
}: BancaDatiClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchText, setSearchText] = useState(initialFilters.q)
  const [streetText, setStreetText] = useState(initialFilters.street)
  const [civicText, setCivicText] = useState(initialFilters.civic)
  const [showLegend, setShowLegend] = useState(false)
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref to the search input — used to prevent URL re-syncs from overwriting
  // text the user is actively typing (race between debounce + server re-render).
  const searchInputRef = useRef<HTMLInputElement>(null)

  function startResize(col: string, e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = colWidths[col]
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(36, startW + ev.clientX - startX)
      setColWidths(prev => ({ ...prev, [col]: w }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Debounced search — auto-applies 500ms after typing stops.
  // Does NOT block typing: the input state updates immediately, only the
  // server navigation is debounced.
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      // Build params inline to avoid stale-closure issues with buildParams
      const current = {
        stage: initialFilters.stage, city: initialFilters.city,
        zone: initialFilters.zone, agent_id: initialFilters.agent_id,
        disposition: initialFilters.disposition, transaction_type: initialFilters.transaction_type,
        sort: initialFilters.sort, viewMode: initialFilters.viewMode,
        q: value, page: '1',
      }
      Object.entries(current).forEach(([k, v]) => {
        if (!v) return
        if (k === 'sort' && v === 'updated_at_desc') return
        if (k === 'viewMode' && v === 'list') return
        params.set(k, v)
      })
      router.push(`${pathname}?${params.toString()}`)
    }, 500)
  }, [pathname, router, initialFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])
  useEffect(() => () => { if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current) }, [])

  // Debounced street change — real-time filter as the user types
  const handleStreetChange = useCallback((value: string) => {
    setStreetText(value)
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current)
    streetDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      const current = {
        stage: initialFilters.stage, city: initialFilters.city,
        zone: initialFilters.zone, agent_id: initialFilters.agent_id,
        disposition: initialFilters.disposition, transaction_type: initialFilters.transaction_type,
        sort: initialFilters.sort, viewMode: initialFilters.viewMode,
        q: searchText, street: value, civic: civicText, page: '1',
      }
      Object.entries(current).forEach(([k, v]) => {
        if (!v) return
        if (k === 'sort' && v === 'updated_at_desc') return
        if (k === 'viewMode' && v === 'list') return
        params.set(k, v)
      })
      router.push(`${pathname}?${params.toString()}`)
    }, 500)
  }, [pathname, router, initialFilters, searchText, civicText]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL→input ONLY when the user is NOT typing (input not focused).
  // This prevents the server re-render triggered by debounce from overwriting
  // characters the user is currently typing in rapid succession.
  useEffect(() => {
    if (document.activeElement !== searchInputRef.current) {
      setSearchText(initialFilters.q)
    }
  }, [initialFilters.q])

  const buildParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams()
    const current = {
      stage: initialFilters.stage,
      city: initialFilters.city,
      zone: initialFilters.zone,
      agent_id: initialFilters.agent_id,
      disposition: initialFilters.disposition,
      transaction_type: initialFilters.transaction_type,
      sort: initialFilters.sort,
      viewMode: initialFilters.viewMode,
      q: searchText,
      street: streetText,
      civic: civicText,
      ...updates,
    }
    Object.entries(current).forEach(([k, v]) => {
      if (!v) return
      if (k === 'sort' && v === 'updated_at_desc') return
      if (k === 'viewMode' && v === 'list') return  // list is default, don't add to URL
      params.set(k, v)
    })
    return params.toString()
  }, [initialFilters, searchText, streetText, civicText])

  const updateUrl = useCallback((updates: Record<string, string>) => {
    router.push(`${pathname}?${buildParams(updates)}`)
  }, [buildParams, pathname, router])

  function clearFilters() {
    setSearchText('')
    setStreetText('')
    setCivicText('')
    router.push(pathname)
  }

  const hasFilters = !!(initialFilters.stage || initialFilters.city || initialFilters.zone || initialFilters.agent_id || initialFilters.disposition || initialFilters.transaction_type || initialFilters.q || initialFilters.street || initialFilters.civic)
  // Zones filtered by selected city
  const filteredZones = initialFilters.city
    ? zonesWithCity.filter(z => z.city === initialFilters.city)
    : zonesWithCity
  const totalPages = Math.ceil(total / perPage)
  const totalAll = Object.values(countByStage).reduce((a, b) => a + b, 0)

  // Label lookups for Select triggers (avoids raw value display in shadcn/ui)
  // Active filter pills (Task 7)
  const activePills: ActivePill[] = []
  if (initialFilters.stage) activePills.push({ key: 'stage', label: STAGE_CONFIG[initialFilters.stage as PropertyStage]?.label ?? initialFilters.stage, clear: { stage: '', page: '1' } })
  if (initialFilters.city) activePills.push({ key: 'city', label: initialFilters.city, clear: { city: '', zone: '', page: '1' } })
  if (initialFilters.zone) activePills.push({ key: 'zone', label: initialFilters.zone, clear: { zone: '', page: '1' } })
  if (initialFilters.transaction_type) activePills.push({ key: 'transaction_type', label: initialFilters.transaction_type === 'vendita' ? 'Vendita' : 'Affitto', clear: { transaction_type: '', page: '1' } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (initialFilters.disposition) activePills.push({ key: 'disposition', label: (DISPOSITION_CONFIG as any)[initialFilters.disposition]?.label ?? initialFilters.disposition, clear: { disposition: '', page: '1' } })
  if (initialFilters.agent_id) activePills.push({ key: 'agent_id', label: agents.find(a => a.id === initialFilters.agent_id)?.name ?? 'Agente', clear: { agent_id: '', page: '1' } })
  if (searchText) activePills.push({ key: 'q', label: `"${searchText}"`, clear: { q: '', page: '1' } })
  if (initialFilters.street) activePills.push({ key: 'street', label: `Via: ${initialFilters.street}`, clear: { street: '', page: '1' } })
  if (initialFilters.civic) activePills.push({ key: 'civic', label: `N.: ${initialFilters.civic}`, clear: { civic: '', page: '1' } })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Banca Dati</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {total === totalAll
              ? `${totalAll} immobili nel workspace`
              : `${total} di ${totalAll} immobili`}
          </p>
        </div>
        <Link href="/banca-dati/nuovo" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Immobile
        </Link>
      </div>

      {/* Stage summary badges */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const StageIcon = config.icon
          const count = countByStage[stage] ?? 0
          const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0
          const isActive = initialFilters.stage === stage
          return (
            <button
              key={stage}
              onClick={() => updateUrl({ stage: isActive ? '' : stage, page: '1' })}
              title={`${config.description} — ${pct}% del totale`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? `${config.bg} ${config.color} border-current shadow-sm scale-105`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:scale-[1.02]'
              }`}
            >
              <StageIcon className="h-3 w-3 shrink-0" />
              {config.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-muted'}`}>
                {count}
              </span>
            </button>
          )
        })}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400 transition-colors ml-1"
          >
            <X className="h-3 w-3" />
            Rimuovi filtri
          </button>
        )}
      </div>

      {/* Filter bar */}
      <BancaDatiFilters
        searchText={searchText}
        onSearchChange={handleSearchChange}
        onSearchCommit={() => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          updateUrl({ q: searchText, page: '1' })
        }}
        searchInputRef={searchInputRef}
        streetText={streetText}
        onStreetTextChange={handleStreetChange}
        onStreetCommit={() => {
          if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current)
          if (streetText !== initialFilters.street) updateUrl({ street: streetText, page: '1' })
        }}
        onStreetClear={() => {
          if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current)
          setStreetText('')
          updateUrl({ street: '', page: '1' })
        }}
        civicText={civicText}
        onCivicTextChange={setCivicText}
        onCivicCommit={() => {
          if (civicText !== initialFilters.civic) updateUrl({ civic: civicText, page: '1' })
        }}
        onCivicClear={() => { setCivicText(''); updateUrl({ civic: '', page: '1' }) }}
        selectedCity={initialFilters.city}
        selectedZone={initialFilters.zone}
        selectedTransactionType={initialFilters.transaction_type}
        selectedDisposition={initialFilters.disposition}
        selectedAgentId={initialFilters.agent_id}
        currentViewMode={initialFilters.viewMode}
        cities={cities}
        filteredZones={filteredZones}
        agents={agents}
        isAdmin={isAdmin}
        onCityChange={(city) => updateUrl({ city, zone: '', page: '1' })}
        onZoneChange={(zone) => updateUrl({ zone, page: '1' })}
        onTransactionTypeChange={(transaction_type) => updateUrl({ transaction_type, page: '1' })}
        onDispositionChange={(disposition) => updateUrl({ disposition, page: '1' })}
        onAgentChange={(agent_id) => updateUrl({ agent_id, page: '1' })}
        onViewModeChange={(viewMode) => updateUrl({ viewMode, page: '1' })}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(v => !v)}
      />

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Filtri attivi:</span>
          {activePills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => {
                if (pill.key === 'q') setSearchText('')
                if (pill.key === 'street') setStreetText('')
                if (pill.key === 'civic') setCivicText('')
                updateUrl(pill.clear)
              }}
              className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.57_0.20_33/0.10)] text-[oklch(0.45_0.20_33)] dark:bg-[oklch(0.57_0.20_33/0.20)] dark:text-[oklch(0.80_0.15_33)] border border-[oklch(0.57_0.20_33/0.25)] px-2.5 py-0.5 text-xs font-medium hover:bg-[oklch(0.57_0.20_33/0.18)] transition-colors"
            >
              {pill.label}
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
          {activePills.length > 1 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <X className="h-3 w-3" />
              Rimuovi tutti
            </button>
          )}
        </div>
      )}

      {/* Legend panel */}
      {showLegend && (
        <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stage Immobile</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STAGE_CONFIG) as [PropertyStage, typeof STAGE_CONFIG[PropertyStage]][]).map(([stage, cfg]) => {
                const Icon = cfg.icon
                return (
                  <div key={stage} className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cfg.bg, cfg.color)}>
                    <Icon className="h-3 w-3" />
                    <span>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Stato Proprietario</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {Object.entries(DISPOSITION_CONFIG).map(([key, cfg]) => (
                <div key={key} className="inline-flex items-center gap-1.5 text-xs">
                  <span className={cn('text-base font-medium leading-none', cfg.color)}>{cfg.symbol}</span>
                  <span className="font-medium">{cfg.label}</span>
                  <span className="text-muted-foreground hidden sm:inline">— {cfg.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Property grid / list */}
      <BancaDatiTable
        properties={properties}
        isLoading={false}
        hasFilters={hasFilters}
        viewMode={initialFilters.viewMode}
        currentSort={initialFilters.sort || 'updated_at_desc'}
        colWidths={colWidths}
        onSort={(sortAsc, sortDesc, isSortedDesc) => {
          updateUrl({ sort: isSortedDesc ? sortAsc : sortDesc, page: '1' })
        }}
        onStartResize={startResize}
        onClearFilters={clearFilters}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} di {total} immobili
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateUrl({ page: String(page - 1) })}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* Page number buttons — show up to 5 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pg > totalPages) return null
              return (
                <Button
                  key={pg}
                  variant={pg === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => pg !== page && updateUrl({ page: String(pg) })}
                >
                  {pg}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateUrl({ page: String(page + 1) })}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
