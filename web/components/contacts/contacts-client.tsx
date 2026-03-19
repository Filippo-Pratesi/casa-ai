'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { UserPlus, Users, Phone, Mail, Euro, Home, Cake, LayoutGrid, List, Search, X, MapPin, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'

// WhatsApp SVG icon (official brand icon)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-label="WhatsApp">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  seller: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  renter: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  other: 'bg-muted text-muted-foreground border-border',
}

const TYPE_ACTIVE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-600 text-white border-blue-600',
  seller: 'bg-green-600 text-white border-green-600',
  renter: 'bg-purple-600 text-white border-purple-600',
  landlord: 'bg-amber-500 text-white border-amber-500',
  other: 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]',
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[]
  min_rooms: number | null
  date_of_birth: string | null
  created_at: string
  agent_name: string | null
  property_addresses: string[]
}

function birthdayDaysLeft(dob: string | null): number | null {
  if (!dob) return null
  const now = new Date()
  // A1: avoid mutating `now` — compute midnight as a separate value
  const todayMidnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const [, mm, dd] = dob.split('-').map(Number)
  let next = new Date(now.getFullYear(), mm - 1, dd)
  if (next.getTime() < todayMidnightMs) next = new Date(now.getFullYear() + 1, mm - 1, dd)
  const diff = Math.ceil((next.getTime() - todayMidnightMs) / 86400000)
  return diff <= 7 ? diff : null
}

interface ContactsClientProps {
  contacts: Contact[]
  isAdmin: boolean
  total: number
  page: number
  perPage: number
}

type SortKey = 'date_desc' | 'date_asc' | 'budget_desc' | 'budget_asc'

export function ContactsClient({ contacts, isAdmin, total, page, perPage }: ContactsClientProps) {
  const { t } = useI18n()
  const router = useRouter()
  const pathname = usePathname()
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [citySearch, setCitySearch] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date_desc')

  const totalPages = Math.ceil(total / perPage)

  function goToPage(p: number) {
    const params = new URLSearchParams()
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  const TYPE_LABELS: Record<string, string> = useMemo(() => ({
    buyer: t('contacts.type.buyer'),
    seller: t('contacts.type.seller'),
    renter: t('contacts.type.renter'),
    landlord: t('contacts.type.landlord'),
    other: t('contacts.type.other'),
  }), [t])

  function toggleType(type: string) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const hasFilters = activeTypes.size > 0 || citySearch.trim() || budgetMax

  function clearFilters() {
    setActiveTypes(new Set())
    setCitySearch('')
    setBudgetMax('')
  }

  const filtered = useMemo(() => {
    const list = contacts.filter(c => {
      if (activeTypes.size > 0 && !activeTypes.has(c.type)) return false
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase()
        const cities = (c.preferred_cities ?? []).join(' ').toLowerCase()
        const addresses = (c.property_addresses ?? []).join(' ').toLowerCase()
        if (!cities.includes(q) && !c.name.toLowerCase().includes(q) && !addresses.includes(q)) return false
      }
      if (budgetMax) {
        const max = Number(budgetMax)
        if (!isNaN(max) && c.budget_max !== null && c.budget_max > max) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'budget_desc') return (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0)
      if (sortBy === 'budget_asc') return (a.budget_max ?? a.budget_min ?? 0) - (b.budget_max ?? b.budget_min ?? 0)
      return 0
    })
  }, [contacts, activeTypes, citySearch, budgetMax, sortBy])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-in-1">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight leading-none">{t('contacts.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length !== contacts.length
              ? `${filtered.length} di ${contacts.length} contatti (pagina ${page} di ${totalPages})`
              : total > contacts.length
                ? `${contacts.length} di ${total} contatti — pagina ${page} di ${totalPages}`
                : contacts.length > 0 ? `${total} contatti` : t('contacts.empty.title')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <div className="flex rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                title={t('common.viewCard')}
                className={`p-2 transition-all duration-200 ${viewMode === 'card' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title={t('common.viewTable')}
                className={`p-2 transition-all duration-200 ${viewMode === 'table' ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <Link href="/contacts/new" className="btn-ai inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" />
            {t('contacts.new')}
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      {contacts.length > 0 && (
        <div className="animate-in-2 rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const active = activeTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${active ? TYPE_ACTIVE_COLORS[key] : TYPE_COLORS[key] + ' hover:opacity-80'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder={t('contacts.filter.searchPlaceholder')}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm placeholder-muted-foreground"
              />
            </div>
            <div className="relative min-w-[140px]">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value)}
                placeholder={t('contacts.filter.budgetMax')}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm placeholder-muted-foreground"
              />
            </div>
            <div className="relative min-w-[160px]">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground appearance-none cursor-pointer"
              >
                <option value="date_desc">Più recenti</option>
                <option value="date_asc">Meno recenti</option>
                <option value="budget_desc">Budget alto</option>
                <option value="budget_asc">Budget basso</option>
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                {t('contacts.filter.clear')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 ? (
        <div className="mesh-bg flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-base font-semibold">{t('contacts.empty.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {t('contacts.empty.body')}
          </p>
          <Link href="/contacts/new" className="btn-ai mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
            <UserPlus className="h-4 w-4" />
            {t('contacts.empty.cta')}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('contacts.noResults')}</p>
          <button onClick={clearFilters} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
            {t('contacts.filter.clear')}
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <div key={c.id} className={`animate-in-${Math.min(i + 3, 8)}`}>
              <ContactCard contact={c} typeLabels={TYPE_LABELS} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_120px_120px_80px_110px_110px] gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.name')}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.type')}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.phone')}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.email')}</p>
            <button
              onClick={() => setSortBy(s => s === 'budget_desc' ? 'budget_asc' : 'budget_desc')}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {t('contacts.col.budget')}
              {sortBy === 'budget_desc' ? <ArrowDown className="h-3 w-3" /> : sortBy === 'budget_asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
            </button>
            <button
              onClick={() => setSortBy(s => s === 'date_desc' ? 'date_asc' : 'date_desc')}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              Aggiunto
              {sortBy === 'date_desc' ? <ArrowDown className="h-3 w-3" /> : sortBy === 'date_asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
            </button>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Da chi</p>
          </div>
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <ContactRow key={c.id} contact={c} typeLabels={TYPE_LABELS} />
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} di {total} contatti
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              if (pg > totalPages) return null
              return (
                <Button
                  key={pg}
                  variant={pg === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => pg !== page && goToPage(pg)}
                >
                  {pg}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
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

// Type-colored left border accents
const TYPE_BORDER_CLASS: Record<string, string> = {
  buyer: 'contact-card-buyer',
  seller: 'contact-card-seller',
  renter: 'contact-card-renter',
  landlord: 'contact-card-landlord',
  other: 'contact-card-other',
}

// Avatar gradient per type
const TYPE_AVATAR_GRADIENT: Record<string, string> = {
  buyer: 'from-blue-500/15 to-blue-400/10 text-blue-700 ring-blue-200',
  seller: 'from-emerald-500/15 to-emerald-400/10 text-emerald-700 ring-emerald-200',
  renter: 'from-purple-500/15 to-purple-400/10 text-purple-700 ring-purple-200',
  landlord: 'from-amber-500/15 to-amber-400/10 text-amber-700 ring-amber-200',
  other: 'from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.10)] text-[oklch(0.50_0.18_33)] ring-[oklch(0.57_0.20_33/0.2)]',
}

// ── Card component ─────────────────────────────────────────────────────────────

function ContactCard({ contact: c, typeLabels }: { contact: Contact; typeLabels: Record<string, string> }) {
  const { t } = useI18n()
  const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const borderClass = TYPE_BORDER_CLASS[c.type] ?? 'contact-card-other'
  const avatarClass = TYPE_AVATAR_GRADIENT[c.type] ?? TYPE_AVATAR_GRADIENT.other

  return (
    <div className={`card-lift group relative rounded-2xl border border-border bg-card overflow-hidden min-h-[200px] flex flex-col ${borderClass}`}>
      {/* Top section — name is the dominant element */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarClass} text-xs font-bold ring-1`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/contacts/${c.id}`} className="block">
              <h3 className="font-bold text-base leading-tight tracking-tight group-hover:text-[oklch(0.57_0.20_33)] transition-colors truncate">{c.name}</h3>
            </Link>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[c.type]}`}>
                {typeLabels[c.type]}
              </span>
              {(() => {
                const days = birthdayDaysLeft(c.date_of_birth)
                return days !== null ? (
                  <span className="flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                    <Cake className="h-2.5 w-2.5" />
                    {days === 0 ? t('common.today') : `${t('common.inDays')} ${days}${t('common.days')}`}
                  </span>
                ) : null
              })()}
            </div>
          </div>
        </div>

        {/* Contact details + action buttons */}
        <div className="mt-3 space-y-1.5">
          {c.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-xs text-muted-foreground/80 flex-1">{c.phone}</span>
              <a
                href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t('common.whatsapp')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-transparent hover:border-green-200"
              >
                <WhatsAppIcon className="h-3 w-3" />
                WhatsApp
              </a>
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-xs text-muted-foreground/80 flex-1 truncate">{c.email}</span>
              <a
                href={`mailto:${c.email}`}
                title={t('common.sendEmail')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[oklch(0.57_0.20_33)] hover:bg-[oklch(0.57_0.20_33/0.08)] transition-colors border border-transparent hover:border-[oklch(0.57_0.20_33/0.2)]"
              >
                <Mail className="h-3 w-3" />
                Email
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section — budget and location, lighter visual weight */}
      {!c.budget_max && (!c.preferred_cities || c.preferred_cities.length === 0) && (
        <div className="mt-auto px-4 pb-3 pt-1">
          <p className="text-xs text-muted-foreground/40 italic">Nessuna preferenza impostata</p>
        </div>
      )}
      {(c.budget_min || c.budget_max || c.min_rooms || (c.preferred_cities ?? []).length > 0) && (
        <div className="mt-auto border-t border-border/60 bg-muted/20 px-4 py-2.5 flex items-center gap-3 flex-wrap">
          {(c.preferred_cities ?? []).length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <MapPin className="h-3 w-3 text-muted-foreground/40" />
              {(c.preferred_cities ?? []).slice(0, 2).join(', ')}
              {(c.preferred_cities ?? []).length > 2 && ` +${(c.preferred_cities ?? []).length - 2}`}
            </span>
          )}
          {(c.budget_min || c.budget_max) && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Euro className="h-3 w-3 text-muted-foreground/40" />
              {c.budget_min ? c.budget_min.toLocaleString('it-IT') : '0'}
              {' — '}
              {c.budget_max ? c.budget_max.toLocaleString('it-IT') : '∞'}
            </span>
          )}
          {c.min_rooms && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Home className="h-3 w-3 text-muted-foreground/40" />
              min {c.min_rooms} {t('common.rooms')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Row component (table view) ─────────────────────────────────────────────────
// Note: uses div+onClick instead of Link to avoid nested <a> hydration error
// (WhatsApp and mailto links are <a> tags inside, so outer must NOT be <a>)

function ContactRow({ contact: c, typeLabels }: { contact: Contact; typeLabels: Record<string, string> }) {
  const router = useRouter()
  const { t } = useI18n()
  const days = birthdayDaysLeft(c.date_of_birth)

  return (
    <div
      onClick={() => router.push(`/contacts/${c.id}`)}
      className="grid grid-cols-[1fr_80px_120px_120px_80px_110px_110px] gap-2 items-center px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate group-hover:text-[oklch(0.57_0.20_33)] transition-colors">{c.name}</p>
          {days !== null && (
            <span className="flex items-center gap-0.5 rounded-full bg-pink-50 border border-pink-200 px-1.5 py-0.5 text-[9px] font-medium text-pink-700 shrink-0">
              <Cake className="h-2 w-2" />
              {days === 0 ? t('common.today') : `${days}${t('common.days')}`}
            </span>
          )}
        </div>
        {(c.preferred_cities ?? []).length > 0 && (
          <p className="text-xs text-muted-foreground truncate">{(c.preferred_cities ?? []).join(', ')}</p>
        )}
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TYPE_COLORS[c.type]}`}>
        {typeLabels[c.type]}
      </span>
      <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
        {c.phone ? (
          <>
            <span className="text-xs text-muted-foreground truncate flex-1">{c.phone}</span>
            <a
              href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('common.whatsapp')}
              className="text-green-600 hover:text-green-700 transition-colors shrink-0"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
            </a>
          </>
        ) : (
          <span className="text-xs text-muted-foreground/30">—</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
        {c.email ? (
          <>
            <span className="text-xs text-muted-foreground truncate flex-1">{c.email}</span>
            <a
              href={`mailto:${c.email}`}
              title={t('common.sendEmail')}
              className="text-[oklch(0.57_0.20_33)] hover:opacity-80 transition-opacity shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </>
        ) : (
          <span className="text-xs text-muted-foreground/30">—</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {(c.budget_min || c.budget_max)
          ? `€${(c.budget_max ?? c.budget_min)!.toLocaleString('it-IT')}`
          : '—'}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(c.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
      </p>
      <p className="text-xs text-muted-foreground truncate" title={c.agent_name ?? undefined}>
        {c.agent_name ?? '—'}
      </p>
    </div>
  )
}
