'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { Search, LayoutDashboard, Users, Calendar, Mail, TrendingUp, CheckSquare, Home, Bell, Settings, Loader2, MapPin, UserRound, Building2 } from 'lucide-react'

const NAV_COMMANDS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, sub: 'Tutti gli annunci' },
  { label: 'Clienti', href: '/contacts', icon: Users, sub: 'Gestione contatti' },
  { label: 'Calendario', href: '/calendar', icon: Calendar, sub: 'Appuntamenti' },
  { label: 'Campagne', href: '/campaigns', icon: Mail, sub: 'Email marketing' },
  { label: 'Vendite', href: '/archive', icon: TrendingUp, sub: 'Immobili venduti e archiviati' },
  { label: 'Banca Dati', href: '/banca-dati', icon: Building2, sub: 'Immobili e proprietari' },
  { label: 'To Do', href: '/todos', icon: CheckSquare, sub: 'Attività in sospeso' },
  { label: 'Notifiche', href: '/notifications', icon: Bell, sub: 'Aggiornamenti recenti' },
  { label: 'Impostazioni', href: '/settings', icon: Settings, sub: 'Workspace e account' },
]

interface SearchResult {
  type: 'listing' | 'contact' | 'property'
  id: string
  label: string
  sub: string
  href: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Open on Ctrl+K / Cmd+K and custom event
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    const customHandler = () => setOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('open-command-palette', customHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('open-command-palette', customHandler)
    }
  }, [])

  // Debounced site-wide search
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
      }
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, runSearch])

  function handleClose() {
    setOpen(false)
    setQuery('')
    setResults([])
  }

  function navigate(href: string) {
    router.push(href)
    handleClose()
  }

  // Filter nav commands by query (client-side, instant)
  const filteredNav = query.length > 0
    ? NAV_COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.sub.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_COMMANDS

  const hasResults = results.length > 0
  const hasNav = filteredNav.length > 0
  const isEmpty = !searching && !hasResults && !hasNav

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b border-border px-4 py-3 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca annunci, clienti, immobili, pagine..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            : <kbd className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded px-1.5 py-0.5">ESC</kbd>
          }
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {isEmpty && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {query.length > 0 ? 'Nessun risultato' : 'Inizia a digitare per cercare…'}
            </p>
          )}

          {/* Site-wide results (listings & contacts) */}
          {hasResults && (
            <div>
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Risultati
              </p>
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.href)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                >
                  {r.type === 'listing'
                    ? <MapPin className="h-4 w-4 text-[oklch(0.57_0.20_33)] shrink-0" />
                    : r.type === 'property'
                      ? <Building2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <UserRound className="h-4 w-4 text-blue-500 shrink-0" />
                  }
                  <span className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation commands */}
          {hasNav && (
            <div>
              {hasResults && <div className="my-1 border-t border-border/50" />}
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Navigazione
              </p>
              {filteredNav.map(cmd => (
                <button
                  key={cmd.href}
                  onClick={() => navigate(cmd.href)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                >
                  <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium block">{cmd.label}</span>
                    <span className="text-xs text-muted-foreground">{cmd.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">
            Premi <kbd className="font-mono border border-border rounded px-1">Ctrl+K</kbd> per aprire
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            <kbd className="font-mono border border-border rounded px-1">↵</kbd> per aprire
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
