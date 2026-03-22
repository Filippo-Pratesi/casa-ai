'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Phone, Euro, X, Loader2, ChevronRight, ArrowUpDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NetworkContact {
  id: string
  name: string
  email: string | null
  phone: string | null
  types: string[] | null
  type: string
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[] | null
  workspace_id: string
  created_at: string
}

interface Workspace {
  id: string
  name: string
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Acquirente',
  seller: 'Venditore',
  renter: 'Affittuario',
  landlord: 'Proprietario',
  other: 'Altro',
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-100 text-blue-700',
  seller: 'bg-emerald-100 text-emerald-700',
  renter: 'bg-purple-100 text-purple-700',
  landlord: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

const TYPE_PILL_INACTIVE: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100',
  seller: 'bg-green-50 text-green-700 border-green-100',
  renter: 'bg-purple-50 text-purple-700 border-purple-100',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-muted text-muted-foreground border-border',
}

const TYPE_PILL_ACTIVE: Record<string, string> = {
  buyer: 'bg-blue-600 text-white border-blue-600',
  seller: 'bg-green-600 text-white border-green-600',
  renter: 'bg-purple-600 text-white border-purple-600',
  landlord: 'bg-amber-500 text-white border-amber-500',
  other: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
}

type SortKey = 'name_asc' | 'date_desc' | 'budget_desc' | 'budget_asc'

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  const fmt = (n: number) => n >= 1000 ? `€${(n / 1000).toFixed(0)}k` : `€${n}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (max) return `fino a ${fmt(max)}`
  if (min) return `da ${fmt(min)}`
  return null
}

interface NetworkSearchModalProps {
  open: boolean
  onClose: () => void
}

export function NetworkSearchModal({ open, onClose }: NetworkSearchModalProps) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [budgetMax, setBudgetMax] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name_asc')
  const [loading, setLoading] = useState(false)
  const [allContacts, setAllContacts] = useState<NetworkContact[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [myWorkspaceId, setMyWorkspaceId] = useState<string>('')
  const [searched, setSearched] = useState(false)

  function toggleType(t: string) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (activeTypes.size > 0) params.set('types', [...activeTypes].join(','))
      if (budgetMax) params.set('budget_max', budgetMax)
      const res = await fetch(`/api/contacts/network-search?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAllContacts(data.contacts ?? [])
      setWorkspaces(data.workspaces ?? [])
      setMyWorkspaceId(data.myWorkspaceId ?? '')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [q, activeTypes, budgetMax])

  const results = useMemo(() => {
    return [...allContacts].sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'budget_desc') return (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0)
      if (sortBy === 'budget_asc') return (a.budget_max ?? a.budget_min ?? 0) - (b.budget_max ?? b.budget_min ?? 0)
      return 0
    })
  }, [allContacts, sortBy])

  function handleContactClick(contact: NetworkContact) {
    onClose()
    router.push(`/contacts/${contact.id}`)
  }

  function handleClose() {
    setQ('')
    setActiveTypes(new Set())
    setBudgetMax('')
    setSortBy('name_asc')
    setAllContacts([])
    setSearched(false)
    onClose()
  }

  const hasFilters = activeTypes.size > 0 || budgetMax

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ricerca Network</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Type pills */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const active = activeTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150',
                    active ? TYPE_PILL_ACTIVE[key] : (TYPE_PILL_INACTIVE[key] + ' hover:opacity-80')
                  )}
                >
                  {label}
                </button>
              )
            })}
            {hasFilters && (
              <button
                onClick={() => { setActiveTypes(new Set()); setBudgetMax('') }}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Search inputs */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, email o telefono..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="relative min-w-[140px]">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="number"
                placeholder="Budget max (€)"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative min-w-[150px]">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm appearance-none cursor-pointer h-10"
              >
                <option value="name_asc">Nome A→Z</option>
                <option value="date_desc">Più recenti</option>
                <option value="budget_desc">Budget alto</option>
                <option value="budget_asc">Budget basso</option>
              </select>
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cerca
            </Button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : searched && results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nessun contatto trovato
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{results.length} contatti trovati</p>
              {results.map((contact) => {
                const ws = workspaces.find((w) => w.id === contact.workspace_id)
                const isOwn = contact.workspace_id === myWorkspaceId
                const types = contact.types ?? [contact.type]
                const budget = formatBudget(contact.budget_min, contact.budget_max)
                return (
                  <button
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="w-full text-left rounded-lg border border-border px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{contact.name}</span>
                        <div className="flex gap-1 flex-wrap">
                          {types.map((t) => (
                            <span key={t} className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[t] ?? TYPE_COLORS.other)}>
                              {TYPE_LABELS[t] ?? t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        )}
                        {budget && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {budget}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {isOwn ? <span className="text-foreground font-medium">La tua agenzia</span> : (ws?.name ?? '—')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>
          ) : !searched ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Usa i filtri e premi Cerca per trovare contatti
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
