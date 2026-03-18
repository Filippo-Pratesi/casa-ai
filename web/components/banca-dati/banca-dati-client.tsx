'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, Building2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PropertyCard, type PropertyCardData } from './property-card'
import { STAGE_CONFIG, type PropertyStage } from './property-stage-icon'
import { DISPOSITION_CONFIG } from './disposition-icon'

const STAGES: PropertyStage[] = ['sconosciuto', 'ignoto', 'conosciuto', 'incarico', 'venduto', 'locato', 'disponibile']

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
  }
}

const SORT_OPTIONS = [
  { value: 'updated_at_desc', label: 'Recenti prima' },
  { value: 'updated_at_asc',  label: 'Meno recenti' },
  { value: 'city_asc',        label: 'Città A→Z' },
  { value: 'city_desc',       label: 'Città Z→A' },
  { value: 'value_desc',      label: 'Valore decrescente' },
  { value: 'value_asc',       label: 'Valore crescente' },
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      q: searchText,
      ...updates,
    }
    Object.entries(current).forEach(([k, v]) => { if (v && v !== 'updated_at_desc') params.set(k, v) })
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
            placeholder="Cerca via, città, proprietario…"
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

        {/* Sort control */}
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
        </div>
      </div>

      {/* Property grid */}
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
