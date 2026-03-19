'use client'

import React from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, ArrowUp, ArrowDown, ChevronsUpDown, Building2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PropertyCard, type PropertyCardData } from './property-card'
import { PropertyStageBadge } from './property-stage-icon'
import { DispositionIcon } from './disposition-icon'

const PROPERTY_TYPE_IT: Record<string, string> = {
  apartment: 'Apt.', house: 'Casa', villa: 'Villa',
  commercial: 'Comm.', land: 'Terreno', garage: 'Garage', other: 'Altro',
}

function splitAddress(address: string): { street: string; civic: string } {
  const match = address.match(/^(.+?)\s+(\d+[a-zA-Z0-9\/]*)$/)
  if (match) return { street: match[1], civic: match[2] }
  return { street: address, civic: '' }
}

interface BancaDatiTableProps {
  properties: PropertyCardData[]
  isLoading: boolean
  hasFilters: boolean
  viewMode: string
  currentSort: string
  colWidths: Record<string, number>
  onSort: (sortAsc: string, sortDesc: string, isSortedDesc: boolean) => void
  onStartResize: (col: string, e: React.MouseEvent) => void
  onClearFilters: () => void
}

export const BancaDatiTable = React.memo(function BancaDatiTable({
  properties,
  isLoading,
  hasFilters,
  viewMode,
  currentSort,
  colWidths,
  onSort,
  onStartResize,
  onClearFilters,
}: BancaDatiTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3 animate-pulse" />
        <p className="text-muted-foreground font-medium">Caricamento…</p>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">
          {hasFilters ? 'Nessun immobile corrisponde ai filtri selezionati' : 'Nessun immobile ancora'}
        </p>
        {hasFilters ? (
          <button onClick={onClearFilters} className="mt-2 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            Rimuovi filtri
          </button>
        ) : (
          <Link href="/banca-dati/nuovo" className={buttonVariants({ variant: 'outline' }) + ' mt-4'}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi il primo immobile
          </Link>
        )}
      </div>
    )
  }

  if (viewMode !== 'grid') {
    return (
      <div className="rounded-xl border border-border overflow-hidden bg-card select-none">
        <div className="overflow-x-auto">
          {/* Headers */}
          <div className="flex items-center bg-muted/40 border-b border-border/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {([
              { key: 'city', label: 'Città', sortAsc: 'city_asc', sortDesc: 'city_desc' },
              { key: 'zone', label: 'Zona', hiddenBelow: 'lg' },
              { key: 'sub_zone', label: 'SZ', hiddenBelow: 'xl' },
              { key: 'street', label: 'Via' },
              { key: 'civic', label: 'N.' },
              { key: 'agent', label: 'Agente', hiddenBelow: 'xl' },
              { key: 'price', label: 'Prezzo', hiddenBelow: 'lg', sortAsc: 'value_asc', sortDesc: 'value_desc' },
              { key: 'owner', label: 'Proprietario', hiddenBelow: 'xl' },
              { key: 'stage', label: 'Stage' },
              { key: 'disposition', label: 'St.' },
              { key: 'op', label: 'Op.', hiddenBelow: 'lg' },
              { key: 'type', label: 'Tipologia', hiddenBelow: 'xl' },
              { key: 'last_event', label: 'Ultima nota', hiddenBelow: 'xl' },
              { key: 'updated', label: 'Agg.', hiddenBelow: 'md', sortAsc: 'updated_at_asc', sortDesc: 'updated_at_desc' },
            ] as { key: string; label: string; hiddenBelow?: string; sortAsc?: string; sortDesc?: string }[]).map(({ key, label, hiddenBelow, sortAsc, sortDesc }) => {
              const isSortedAsc = sortAsc && currentSort === sortAsc
              const isSortedDesc = sortDesc && currentSort === sortDesc
              const isSortable = !!(sortAsc && sortDesc)
              function handleSortClick() {
                if (!isSortable) return
                onSort(sortAsc!, sortDesc!, !!isSortedDesc)
              }
              return (
                <div
                  key={key}
                  style={{ width: colWidths[key], minWidth: colWidths[key] }}
                  className={cn(
                    'relative shrink-0 px-2 py-2 whitespace-nowrap',
                    hiddenBelow === 'lg' && 'hidden lg:block',
                    hiddenBelow === 'xl' && 'hidden xl:block',
                    hiddenBelow === 'md' && 'hidden md:block',
                    isSortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                    (isSortedAsc || isSortedDesc) && 'text-foreground',
                  )}
                  onClick={isSortable ? handleSortClick : undefined}
                >
                  <span className="flex items-center gap-0.5">
                    {label}
                    {isSortable && (
                      isSortedAsc ? <ArrowUp className="h-3 w-3 shrink-0" /> :
                      isSortedDesc ? <ArrowDown className="h-3 w-3 shrink-0" /> :
                      <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
                    )}
                  </span>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 z-10"
                    onMouseDown={(e) => { e.stopPropagation(); onStartResize(key, e) }}
                  />
                </div>
              )
            })}
            <div className="w-8 shrink-0" />
          </div>
          {/* Rows — inside shared scroll container */}
          {properties.map((p) => {
            const { street, civic } = splitAddress(p.address)
            const lastEv = (p as PropertyCardData & { last_event?: { title: string; event_date: string } | null }).last_event
            return (
              <Link
                key={p.id}
                href={`/banca-dati/${p.id}`}
                className="group relative flex items-center border-b border-border/20 last:border-0 hover:bg-[oklch(0.57_0.20_33/0.10)] dark:hover:bg-[oklch(0.57_0.20_33/0.18)] hover:[box-shadow:inset_0_0_0_1.5px_oklch(0.57_0.20_33/0.35)] transition-all cursor-pointer z-0 hover:z-10"
              >
                <div style={{ width: colWidths.city, minWidth: colWidths.city }} className="shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.city}</div>
                <div style={{ width: colWidths.zone, minWidth: colWidths.zone }} className="hidden lg:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.zone ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.sub_zone, minWidth: colWidths.sub_zone }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{(p as PropertyCardData & { sub_zone?: string | null }).sub_zone ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.street, minWidth: colWidths.street }} className="shrink-0 px-2 py-2 text-sm font-medium truncate">{street}</div>
                <div style={{ width: colWidths.civic, minWidth: colWidths.civic }} className="shrink-0 px-2 py-2 text-xs text-muted-foreground tabular-nums">{civic}</div>
                <div style={{ width: colWidths.agent, minWidth: colWidths.agent }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{(p as PropertyCardData & { agent_name?: string | null }).agent_name ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.price, minWidth: colWidths.price }} className="hidden lg:block shrink-0 px-2 py-2 text-xs font-semibold tabular-nums">{p.estimated_value ? `€${p.estimated_value.toLocaleString('it-IT')}` : <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.owner, minWidth: colWidths.owner }} className="hidden xl:block shrink-0 px-2 py-2 text-xs text-muted-foreground truncate">{p.owner_name ?? <span className="opacity-30">—</span>}</div>
                <div style={{ width: colWidths.stage, minWidth: colWidths.stage }} className="shrink-0 px-2 py-1.5"><PropertyStageBadge stage={p.stage} /></div>
                <div style={{ width: colWidths.disposition, minWidth: colWidths.disposition }} className="shrink-0 px-1 py-2 flex items-center justify-center"><DispositionIcon disposition={p.owner_disposition} /></div>
                <div style={{ width: colWidths.op, minWidth: colWidths.op }} className="hidden lg:flex shrink-0 px-2 py-2 items-center">
                  {p.transaction_type ? (
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                      p.transaction_type === 'affitto'
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                    )}>
                      {p.transaction_type === 'affitto' ? 'Affitto' : 'Vendita'}
                    </span>
                  ) : <span className="opacity-30 text-xs">—</span>}
                </div>
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
        {/* /overflow-x-auto */}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  )
})
