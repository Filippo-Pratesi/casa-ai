'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_CHIPS = [
  { value: 'buyer', label: 'Acquirente' },
  { value: 'seller', label: 'Venditore' },
  { value: 'renter', label: 'Affittuario' },
  { value: 'landlord', label: 'Proprietario' },
]

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

export interface CampaignContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  types: string[]
  city_of_residence: string | null
  previously_contacted: boolean
}

interface RecipientSelectorProps {
  cities: string[]
  listingId?: string | null
  channel: 'email' | 'whatsapp'
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

export function RecipientSelector({
  cities,
  listingId,
  channel,
  selectedIds,
  onSelectionChange,
}: RecipientSelectorProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<CampaignContact[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const fetchContacts = useCallback(
    async (types: string[], cities: string[], searchQuery: string) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (types.length > 0) params.set('types', types.join(','))
        if (cities.length > 0) params.set('cities', cities.join(','))
        if (searchQuery) params.set('search', searchQuery)
        if (listingId) params.set('listing_id', listingId)
        params.set('channel', channel)

        const res = await fetch(`/api/campaigns/contacts?${params}`, {
          signal: ctrl.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        setContacts(data.contacts ?? [])
      } catch {
        // aborted or network error — ignore
      } finally {
        setLoading(false)
      }
    },
    [listingId, channel]
  )

  // Initial load
  useEffect(() => {
    fetchContacts([], [], '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchContacts])

  // Re-fetch with debounce whenever filters/search change
  useEffect(() => {
    const t = setTimeout(() => {
      fetchContacts(selectedTypes, selectedCities, search)
    }, 250)
    return () => clearTimeout(t)
  }, [selectedTypes, selectedCities, search, fetchContacts])

  function toggleType(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  function toggleCity(city: string) {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    )
  }

  function toggleContact(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  function selectAll() {
    const next = new Set(selectedIds)
    contacts.forEach(c => next.add(c.id))
    onSelectionChange(next)
  }

  function deselectAll() {
    const next = new Set(selectedIds)
    contacts.forEach(c => next.delete(c.id))
    onSelectionChange(next)
  }

  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))

  return (
    <div className="space-y-3">
      {/* Type chips */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Tipo cliente</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_CHIPS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleType(t.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                selectedTypes.includes(t.value)
                  ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* City chips — show up to 12 */}
      {cities.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Città</p>
          <div className="flex flex-wrap gap-1.5">
            {cities.slice(0, 12).map(city => (
              <button
                key={city}
                type="button"
                onClick={() => toggleCity(city)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  selectedCities.includes(city)
                    ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                )}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome, email, telefono…"
          className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[oklch(0.57_0.20_33/0.3)]"
        />
      </div>

      {/* Contact list */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header row */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
          <div className="flex items-center gap-1.5">
            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <span className="text-xs text-muted-foreground">
              {loading
                ? 'Caricamento…'
                : `${contacts.length} trovati${selectedIds.size > 0 ? ` · ${selectedIds.size} selezionati` : ''}`}
            </span>
          </div>
          <button
            type="button"
            onClick={allSelected ? deselectAll : selectAll}
            className="text-xs text-[oklch(0.57_0.20_33)] hover:underline"
          >
            {allSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
          </button>
        </div>

        {/* Scrollable list */}
        <div className="max-h-[280px] overflow-y-auto divide-y divide-border">
          {contacts.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessun contatto trovato
            </p>
          )}
          {contacts.map(contact => (
            <label
              key={contact.id}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(contact.id)}
                onChange={() => toggleContact(contact.id)}
                className="rounded border-border shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">{contact.name}</span>
                  {contact.previously_contacted && (
                    <span
                      className="text-amber-500 font-bold text-xs shrink-0"
                      title="Già raggiunto da una campagna per questo annuncio"
                    >
                      *
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  {channel === 'email' ? (
                    contact.email && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {contact.email}
                      </span>
                    )
                  ) : (
                    contact.phone && (
                      <span className="text-[11px] text-muted-foreground">{contact.phone}</span>
                    )
                  )}
                  {contact.city_of_residence && (
                    <span className="text-[11px] text-muted-foreground/60 shrink-0">
                      · {contact.city_of_residence}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0 justify-end max-w-[90px]">
                {(contact.types ?? []).slice(0, 2).map(t => (
                  <span
                    key={t}
                    className="text-[10px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground leading-tight"
                  >
                    {TYPE_LABELS[t] ?? t}
                  </span>
                ))}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Legend for asterisk */}
      {listingId && (
        <p className="text-[11px] text-muted-foreground/60">
          * già raggiunto da una campagna per questo annuncio
        </p>
      )}
    </div>
  )
}
