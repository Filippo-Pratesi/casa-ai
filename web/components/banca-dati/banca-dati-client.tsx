'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PropertyCard, type PropertyCardData } from './property-card'
import { STAGE_CONFIG, type PropertyStage } from './property-stage-icon'
import { DISPOSITION_CONFIG, type OwnerDisposition } from './disposition-icon'

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
  }
}

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

  const updateUrl = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams()
    const current = {
      stage: initialFilters.stage,
      zone: initialFilters.zone,
      agent_id: initialFilters.agent_id,
      disposition: initialFilters.disposition,
      transaction_type: initialFilters.transaction_type,
      q: searchText,
      ...updates,
    }
    Object.entries(current).forEach(([k, v]) => { if (v) params.set(k, v) })
    router.push(`${pathname}?${params.toString()}`)
  }, [initialFilters, pathname, router, searchText])

  function clearFilters() {
    setSearchText('')
    router.push(pathname)
  }

  const hasFilters = !!(initialFilters.stage || initialFilters.zone || initialFilters.agent_id || initialFilters.disposition || initialFilters.transaction_type || initialFilters.q)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banca Dati</h1>
          <p className="text-sm text-muted-foreground">{total} immobili nel workspace</p>
        </div>
        <Button asChild>
          <Link href="/banca-dati/nuovo">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Immobile
          </Link>
        </Button>
      </div>

      {/* Stage summary badges */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const count = countByStage[stage] ?? 0
          const isActive = initialFilters.stage === stage
          return (
            <button
              key={stage}
              onClick={() => updateUrl({ stage: isActive ? '' : stage, page: '1' })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? `${config.bg} ${config.color} border-current`
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {config.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-muted'}`}>
                {count}
              </span>
            </button>
          )
        })}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          >
            <X className="h-3 w-3" />
            Rimuovi filtri
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cerca via, città, proprietario..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateUrl({ q: searchText, page: '1' })}
            className="pl-8 h-8 text-sm bg-background"
          />
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <Select
            value={initialFilters.zone || 'all'}
            onValueChange={(v) => updateUrl({ zone: v === 'all' ? '' : v, page: '1' })}
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
          onValueChange={(v) => updateUrl({ transaction_type: v === 'all' ? '' : v, page: '1' })}
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
          onValueChange={(v) => updateUrl({ disposition: v === 'all' ? '' : v, page: '1' })}
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
            onValueChange={(v) => updateUrl({ agent_id: v === 'all' ? '' : v, page: '1' })}
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

        {/* Apply search button */}
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={() => updateUrl({ q: searchText, page: '1' })}
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filtra
        </Button>
      </div>

      {/* Property grid */}
      {properties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-muted-foreground font-medium">
            {hasFilters ? 'Nessun immobile corrisponde ai filtri selezionati' : 'Nessun immobile ancora'}
          </p>
          {!hasFilters && (
            <Button asChild className="mt-4" variant="outline">
              <Link href="/banca-dati/nuovo">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi il primo immobile
              </Link>
            </Button>
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
            Pagina {page} di {totalPages} — {total} immobili
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateUrl({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateUrl({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
