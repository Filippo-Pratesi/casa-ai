'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, Building2, LayoutGrid, LayoutList, HelpCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PropertyCard, type PropertyCardData } from './property-card'
import { PropertyStageBadge, STAGE_CONFIG, type PropertyStage } from './property-stage-icon'
import { DispositionIcon, DISPOSITION_CONFIG } from './disposition-icon'

const STAGES: PropertyStage[] = ['sconosciuto', 'ignoto', 'conosciuto', 'incarico', 'venduto', 'locato', 'disponibile']

const PROPERTY_TYPE_IT: Record<string, string> = {
  apartment: 'Appartamento', house: 'Casa', villa: 'Villa',
  commercial: 'Commerciale', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

function splitAddress(address: string): { street: string; civic: string } {
  const match = address.match(/^(.+?)\s+(\d+[a-zA-Z0-9\/]*)$/)
  if (match) return { street: match[1], civic: match[2] }
  return { street: address, civic: '' }
}

const DEFAULT_WIDTHS: Record<string, number> = {
  city: 90, zone: 90, sub_zone: 70, street: 160, civic: 52,
  agent: 90, price: 80, owner: 110, stage: 90, disposition: 32,
  type: 70, last_event: 160, updated: 70,
}

interface BancaDatiClientProps {
  properties: PropertyCardData[]
  total: number
  page: number
  perPage: number
  countByStage: Record<string, number>
  zones: string[]
  agents: { id: string; name: string }[]
  isAdmin: boolean
  initialFilters: {
    stage: string
    zone: string
    agent_id: string
    disposition: string
    transaction_type: string
    q: string
    sort: string
    viewMode: string
  }
}

const SORT_OPTIONS = [
  { value: 'updated_at_desc', label: 'Recenti prima' },
  { value: 'updated_at_asc',  label: 'Meno recenti' },
  { value: 'city_asc',        label: 'Città A→Z' },
  { value: 'city_desc',       label: 'Città Z→A' },
  { value: 'value_desc',      label: 'Prezzo decrescente' },
  { value: 'value_asc',       label: 'Prezzo crescente' },
]

export function BancaDatiClient({
  properties,
  total,
  page,
  perPage,
  countByStage,
  zones,
  agents,
  isAdmin,
  initialFilters,
}: BancaDatiClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchText, setSearchText] = useState(initialFilters.q)
  const [showLegend, setShowLegend] = useState(false)
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Debounced search — auto-applies 400ms after typing
  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = buildParams({ q: value, page: '1' })
      router.push(`${pathname}?${params}`)
    }, 400)
  }, [pathname, router]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const buildParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams()
    const current = {
      stage: initialFilters.stage,
      zone: initialFilters.zone,
      agent_id: initialFilters.agent_id,
      disposition: initialFilters.disposition,
      transaction_type: initialFilters.transaction_type,
      sort: initialFilters.sort,
      viewMode: initialFilters.viewMode,
      q: searchText,
      ...updates,
    }
    Object.entries(current).forEach(([k, v]) => {
      if (!v) return
      if (k === 'sort' && v === 'updated_at_desc') return
      if (k === 'viewMode' && v === 'list') return  // list is default, don't add to URL
      params.set(k, v)
    })
    return params.toString()
  }, [initialFilters, searchText])

  const updateUrl = useCallback((updates: Record<string, string>) => {
    router.push(`${pathname}?${buildParams(updates)}`)
  }, [buildParams, pathname, router])

  function clearFilters() {
    setSearchText('')
    router.push(pathname)
  }

  const hasFilters = !!(initialFilters.stage || initialFilters.zone || initialFilters.agent_id || initialFilters.disposition || initialFilters.transaction_type || initialFilters.q)
  const totalPages = Math.ceil(total / perPage)
  const totalAll = Object.values(countByStage).reduce((a, b) => a + b, 0)

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
          const count = countByStage[stage] ?? 0
          const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0
          const isActive = initialFilters.stage === stage
          return (
            <button
              key={stage}
              onClick={() => updateUrl({ stage: isActive ? '' : stage, page: '1' })}
              title={`${pct}% del totale`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? `${config.bg} ${config.color} border-current shadow-sm scale-105`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:scale-[1.02]'
              }`}
            >
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
      <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/20 p-3">
        {/* Search — live debounced */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cerca via, città, zona…"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                updateUrl({ q: searchText, page: '1' })
              }
            }}
            className="pl-8 h-8 text-sm bg-background"
          />
          {searchText && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => handleSearchChange('')}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <Select
            value={initialFilters.zone || 'all'}
            onValueChange={(v) => updateUrl({ zone: !v || v === 'all' ? '' : v, page: '1' })}
          >
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le zone</SelectItem>
              {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Transaction type */}
        <Select
          value={initialFilters.transaction_type || 'all'}
          onValueChange={(v) => updateUrl({ transaction_type: !v || v === 'all' ? '' : v, page: '1' })}
        >
          <SelectTrigger className="h-8 w-[130px] text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vendita + Affitto</SelectItem>
            <SelectItem value="vendita">Vendita</SelectItem>
            <SelectItem value="affitto">Affitto</SelectItem>
          </SelectContent>
        </Select>

        {/* Disposition filter */}
        <Select
          value={initialFilters.disposition || 'all'}
          onValueChange={(v) => updateUrl({ disposition: !v || v === 'all' ? '' : v, page: '1' })}
        >
          <SelectTrigger className="h-8 w-[160px] text-sm">
            <SelectValue placeholder="Stato proprietario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {Object.entries(DISPOSITION_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Agent filter (admin only) */}
        {isAdmin && agents.length > 1 && (
          <Select
            value={initialFilters.agent_id || 'all'}
            onValueChange={(v) => updateUrl({ agent_id: !v || v === 'all' ? '' : v, page: '1' })}
          >
            <SelectTrigger className="h-8 w-[140px] text-sm">
              <SelectValue placeholder="Agente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli agenti</SelectItem>
              {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Sort control + view toggle + legend */}
        <div className="ml-auto flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Select
            value={initialFilters.sort || 'updated_at_desc'}
            onValueChange={(v) => updateUrl({ sort: v ?? 'updated_at_desc', page: '1' })}
          >
            <SelectTrigger className="h-8 w-[160px] text-sm border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode + Legend */}
          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-border/60">
            <button
              onClick={() => setShowLegend(v => !v)}
              title="Mostra legenda"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', showLegend ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateUrl({ viewMode: 'grid', page: '1' })}
              title="Vista griglia"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', initialFilters.viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => updateUrl({ viewMode: 'list', page: '1' })}
              title="Vista lista"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', initialFilters.viewMode !== 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

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
      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {hasFilters ? 'Nessun immobile corrisponde ai filtri selezionati' : 'Nessun immobile ancora'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="mt-2 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Rimuovi filtri
            </button>
          ) : (
            <Link href="/banca-dati/nuovo" className={buttonVariants({ variant: 'outline' }) + ' mt-4'}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi il primo immobile
            </Link>
          )}
        </div>
      ) : initialFilters.viewMode !== 'grid' ? (
        <div className="rounded-xl border border-border overflow-hidden bg-card select-none">
          {/* Headers */}
          <div className="flex items-center bg-muted/40 border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground overflow-x-auto">
            {[
              { key: 'city', label: 'Città' },
              { key: 'zone', label: 'Zona', hiddenBelow: 'lg' },
              { key: 'sub_zone', label: 'SZ', hiddenBelow: 'xl' },
              { key: 'street', label: 'Via' },
              { key: 'civic', label: 'N.' },
              { key: 'agent', label: 'Agente', hiddenBelow: 'xl' },
              { key: 'price', label: 'Prezzo', hiddenBelow: 'lg' },
              { key: 'owner', label: 'Proprietario', hiddenBelow: 'xl' },
              { key: 'stage', label: 'Stage' },
              { key: 'disposition', label: 'St.' },
              { key: 'type', label: 'Tipologia', hiddenBelow: 'xl' },
              { key: 'last_event', label: 'Ultima nota', hiddenBelow: 'xl' },
              { key: 'updated', label: 'Agg.', hiddenBelow: 'md' },
            ].map(({ key, label, hiddenBelow }) => (
              <div
                key={key}
                style={{ width: colWidths[key], minWidth: colWidths[key] }}
                className={cn(
                  'relative shrink-0 px-2 py-2 whitespace-nowrap',
                  hiddenBelow === 'lg' && 'hidden lg:block',
                  hiddenBelow === 'xl' && 'hidden xl:block',
                  hiddenBelow === 'md' && 'hidden md:block',
                )}
              >
                {label}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
                  onMouseDown={(e) => startResize(key, e)}
                />
              </div>
            ))}
            <div className="w-8 shrink-0" />
          </div>
          {/* Rows */}
          {properties.map((p) => {
            const { street, civic } = splitAddress(p.address)
            const lastEv = (p as PropertyCardData & { last_event?: { title: string; event_date: string } | null }).last_event
            return (
              <Link
                key={p.id}
                href={`/banca-dati/${p.id}`}
                className="group flex items-center border-b border-border/20 last:border-0 hover:bg-primary/[0.04] dark:hover:bg-primary/[0.08] transition-colors cursor-pointer overflow-x-auto"
              >
                <div style={{ width: colWidths.city, minWidth: colWidths.city }} className="shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.city}</div>
                <div style={{ width: colWidths.zone, minWidth: colWidths.zone }} className="hidden lg:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.zone ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.sub_zone, minWidth: colWidths.sub_zone }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{(p as PropertyCardData & { sub_zone?: string | null }).sub_zone ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.street, minWidth: colWidths.street }} className="shrink-0 px-2 py-2 text-sm font-medium truncate">{street}</div>
                <div style={{ width: colWidths.civic, minWidth: colWidths.civic }} className="shrink-0 px-2 py-2 text-xs text-muted-foreground tabular-nums">{civic}</div>
                <div style={{ width: colWidths.agent, minWidth: colWidths.agent }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{(p as PropertyCardData & { agent_name?: string | null }).agent_name ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.price, minWidth: colWidths.price }} className="hidden lg:block shrink-0 px-2 py-2 text-xs font-semibold tabular-nums">{p.estimated_value ? `€${p.estimated_value.toLocaleString('it-IT')}` : <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.owner, minWidth: colWidths.owner }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.owner_name ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.stage, minWidth: colWidths.stage }} className="shrink-0 px-2 py-1.5 flex items-center gap-1 flex-wrap">
                  <PropertyStageBadge stage={p.stage} />
                  {p.transaction_type && (
                    <span className={cn(
                      'rounded px-1 py-0.5 text-[9px] font-semibold leading-none',
                      p.transaction_type === 'affitto'
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                    )}>
                      {p.transaction_type === 'affitto' ? 'Aff.' : 'Vend.'}
                    </span>
                  )}
                </div>
                <div style={{ width: colWidths.disposition, minWidth: colWidths.disposition }} className="shrink-0 px-1 py-2 flex items-center justify-center"><DispositionIcon disposition={p.owner_disposition} /></div>
                <div style={{ width: colWidths.type, minWidth: colWidths.type }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{PROPERTY_TYPE_IT[(p as PropertyCardData & { property_type?: string | null }).property_type ?? ''] ?? <span className="opacity-30">—</span>}</div>
                <div
                  style={{ width: colWidths.last_event, minWidth: colWidths.last_event }}
                  className="hidden xl:block shrink-0 px-2 py-1.5 min-w-0"
                  title={lastEv ? `${lastEv.title} · ${formatDistanceToNow(new Date(lastEv.event_date), { addSuffix: true, locale: it })}` : undefined}
                >
                  {lastEv ? (
                    <>
                      <p className="text-xs text-foreground/80 truncate leading-tight">{lastEv.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">{formatDistanceToNow(new Date(lastEv.event_date), { addSuffix: false, locale: it })}</p>
                    </>
                  ) : <span className="text-xs opacity-30">—</span>}
                </div>
                <div style={{ width: colWidths.updated, minWidth: colWidths.updated }} className="hidden md:block shrink-0 px-2 py-2 text-xs text-muted-foreground text-right">{formatDistanceToNow(new Date(p.updated_at), { addSuffix: false, locale: it })}</div>
                <div className="w-8 shrink-0 flex items-center justify-center">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      )}

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
