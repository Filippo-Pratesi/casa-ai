'use client'

import React from 'react'
import { Search, X, HelpCircle, LayoutGrid, LayoutList } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DISPOSITION_CONFIG } from './disposition-icon'

interface BancaDatiFiltersProps {
  // Search
  searchText: string
  onSearchChange: (value: string) => void
  onSearchCommit: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  // Street
  streetText: string
  onStreetTextChange: (value: string) => void
  onStreetCommit: () => void
  onStreetClear: () => void
  // Civic
  civicText: string
  onCivicTextChange: (value: string) => void
  onCivicCommit: () => void
  onCivicClear: () => void
  // Filter values (from URL / initialFilters)
  selectedCity: string
  selectedZone: string
  selectedTransactionType: string
  selectedDisposition: string
  selectedAgentId: string
  currentViewMode: string
  // Data for dropdowns
  cities: string[]
  filteredZones: { name: string; city: string }[]
  agents: { id: string; name: string }[]
  isAdmin: boolean
  // Actions
  onCityChange: (city: string) => void
  onZoneChange: (zone: string) => void
  onTransactionTypeChange: (type: string) => void
  onDispositionChange: (disposition: string) => void
  onAgentChange: (agentId: string) => void
  onViewModeChange: (mode: string) => void
  // Legend
  showLegend: boolean
  onToggleLegend: () => void
}

export const BancaDatiFilters = React.memo(function BancaDatiFilters({
  searchText,
  onSearchChange,
  onSearchCommit,
  searchInputRef,
  streetText,
  onStreetTextChange,
  onStreetCommit,
  onStreetClear,
  civicText,
  onCivicTextChange,
  onCivicCommit,
  onCivicClear,
  selectedCity,
  selectedZone,
  selectedTransactionType,
  selectedDisposition,
  selectedAgentId,
  currentViewMode,
  cities,
  filteredZones,
  agents,
  isAdmin,
  onCityChange,
  onZoneChange,
  onTransactionTypeChange,
  onDispositionChange,
  onAgentChange,
  onViewModeChange,
  showLegend,
  onToggleLegend,
}: BancaDatiFiltersProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
      {/* Row 1: Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchInputRef}
          placeholder="Cerca via, città, zona…"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearchCommit()
          }}
          className="pl-8 h-8 text-sm bg-background"
        />
        {searchText && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Città filter */}
        {cities.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground px-0.5">Città</span>
            <Select
              value={selectedCity || 'all'}
              onValueChange={(v) => onCityChange(!v || v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <span className="truncate">{selectedCity || 'Tutte'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Zona filter — cascades from city */}
        {filteredZones.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground px-0.5">Zona</span>
            <Select
              value={selectedZone || 'all'}
              onValueChange={(v) => onZoneChange(!v || v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-8 w-[140px] text-sm">
                <span className="truncate">{selectedZone || 'Tutte'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {filteredZones.map((z) => <SelectItem key={`${z.city}:${z.name}`} value={z.name}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Operazione */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground px-0.5">Operazione</span>
          <Select
            value={selectedTransactionType || 'all'}
            onValueChange={(v) => onTransactionTypeChange(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-[120px] text-sm">
              <span className="truncate">
                {selectedTransactionType === 'vendita' ? 'Vendita' : selectedTransactionType === 'affitto' ? 'Affitto' : 'Tutte'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="vendita">Vendita</SelectItem>
              <SelectItem value="affitto">Affitto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stato proprietario */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground px-0.5">Stato proprietario</span>
          <Select
            value={selectedDisposition || 'all'}
            onValueChange={(v) => onDispositionChange(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-sm">
              <span className="truncate flex items-center gap-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {selectedDisposition ? (
                  <>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span className={(DISPOSITION_CONFIG as any)[selectedDisposition]?.color}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(DISPOSITION_CONFIG as any)[selectedDisposition]?.symbol}
                    </span>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(DISPOSITION_CONFIG as any)[selectedDisposition]?.label ?? selectedDisposition}
                  </>
                ) : 'Tutti'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {Object.entries(DISPOSITION_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    <span className={cfg.color}>{cfg.symbol}</span>
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agente (admin only) */}
        {agents.length > 1 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground px-0.5">Agente</span>
            <Select
              value={selectedAgentId || 'all'}
              onValueChange={(v) => onAgentChange(!v || v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-8 w-[140px] text-sm">
                <span className="truncate">
                  {selectedAgentId ? (agents.find(a => a.id === selectedAgentId)?.name ?? 'Agente') : 'Tutti'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Via filter */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground px-0.5">Via</span>
          <div className="relative">
            <Input
              placeholder="es. Garibaldi"
              value={streetText}
              onChange={(e) => onStreetTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onStreetCommit()
              }}
              onBlur={onStreetCommit}
              className="h-8 w-[140px] text-sm bg-background pr-6"
            />
            {streetText && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={onStreetClear}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Civico filter */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium text-muted-foreground px-0.5">Civico</span>
          <div className="relative">
            <Input
              placeholder="es. 12"
              value={civicText}
              onChange={(e) => onCivicTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCivicCommit()
              }}
              onBlur={onCivicCommit}
              className="h-8 w-[80px] text-sm bg-background pr-6"
            />
            {civicText && (
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={onCivicClear}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* View toggle + legend — right-aligned */}
        <div className="ml-auto flex items-end gap-1">
          {/* View mode + Legend */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleLegend}
              title="Mostra legenda"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', showLegend ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              title="Vista griglia"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', currentViewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              title="Vista lista"
              className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', currentViewMode !== 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
