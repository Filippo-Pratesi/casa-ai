'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserPlus, Users, Phone, Mail, Euro, Home, Cake, LayoutGrid, List, Search, X } from 'lucide-react'
import { ExportContactsButton } from '@/components/contacts/export-contacts-button'
import { useI18n } from '@/lib/i18n/context'

// WhatsApp SVG icon (official brand icon)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-label="WhatsApp">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const TYPE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-50 text-blue-700 border-blue-100',
  seller: 'bg-green-50 text-green-700 border-green-100',
  renter: 'bg-purple-50 text-purple-700 border-purple-100',
  landlord: 'bg-amber-50 text-amber-700 border-amber-100',
  other: 'bg-neutral-50 text-neutral-700 border-neutral-200',
}

const TYPE_ACTIVE_COLORS: Record<string, string> = {
  buyer: 'bg-blue-600 text-white border-blue-600',
  seller: 'bg-green-600 text-white border-green-600',
  renter: 'bg-purple-600 text-white border-purple-600',
  landlord: 'bg-amber-500 text-white border-amber-500',
  other: 'bg-neutral-700 text-white border-neutral-700',
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
}

function birthdayDaysLeft(dob: string | null): number | null {
  if (!dob) return null
  const today = new Date()
  const [, mm, dd] = dob.split('-').map(Number)
  let next = new Date(today.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
  const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
  return diff <= 7 ? diff : null
}

interface ContactsClientProps {
  contacts: Contact[]
  isAdmin: boolean
}

export function ContactsClient({ contacts, isAdmin }: ContactsClientProps) {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set())
  const [citySearch, setCitySearch] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [minRooms, setMinRooms] = useState('')

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

  const hasFilters = activeTypes.size > 0 || citySearch.trim() || budgetMax || minRooms

  function clearFilters() {
    setActiveTypes(new Set())
    setCitySearch('')
    setBudgetMax('')
    setMinRooms('')
  }

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (activeTypes.size > 0 && !activeTypes.has(c.type)) return false
      if (citySearch.trim()) {
        const q = citySearch.trim().toLowerCase()
        const cities = (c.preferred_cities ?? []).join(' ').toLowerCase()
        if (!cities.includes(q) && !c.name.toLowerCase().includes(q)) return false
      }
      if (budgetMax) {
        const max = Number(budgetMax)
        if (!isNaN(max) && c.budget_min !== null && c.budget_min > max) return false
      }
      if (minRooms) {
        const rooms = Number(minRooms)
        if (!isNaN(rooms) && c.min_rooms !== null && c.min_rooms < rooms) return false
      }
      return true
    })
  }, [contacts, activeTypes, citySearch, budgetMax, minRooms])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('contacts.title')}</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {filtered.length !== contacts.length
              ? `${filtered.length} di ${contacts.length} contatti`
              : contacts.length > 0 ? `${contacts.length} contatti` : t('contacts.empty.title')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <div className="flex rounded-lg border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                title={t('common.viewCard')}
                className={`p-2 transition-colors ${viewMode === 'card' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title={t('common.viewTable')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {isAdmin && <ExportContactsButton />}
          <Button nativeButton={false} render={<Link href="/contacts/new" />} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {t('contacts.new')}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {contacts.length > 0 && (
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 space-y-3 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const active = activeTypes.has(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleType(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${active ? TYPE_ACTIVE_COLORS[key] : TYPE_COLORS[key] + ' hover:opacity-80'}`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                value={citySearch}
                onChange={e => setCitySearch(e.target.value)}
                placeholder={t('contacts.filter.searchPlaceholder')}
                className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            <div className="relative min-w-[140px]">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="number"
                value={budgetMax}
                onChange={e => setBudgetMax(e.target.value)}
                placeholder={t('contacts.filter.budgetMax')}
                className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            <div className="relative min-w-[120px]">
              <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="number"
                value={minRooms}
                onChange={e => setMinRooms(e.target.value)}
                placeholder={t('contacts.filter.minRooms')}
                className="w-full rounded-lg border border-neutral-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-neutral-900 placeholder-neutral-400"
              />
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50 transition-colors"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <Users className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">{t('contacts.empty.title')}</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">
            {t('contacts.empty.body')}
          </p>
          <Button nativeButton={false} render={<Link href="/contacts/new" />} className="mt-6 gap-2">
            <UserPlus className="h-4 w-4" />
            {t('contacts.empty.cta')}
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
          <Search className="h-8 w-8 text-neutral-300 mb-3" />
          <p className="text-sm text-neutral-500">{t('contacts.noResults')}</p>
          <button onClick={clearFilters} className="mt-2 text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2 transition-colors">
            {t('contacts.filter.clear')}
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ContactCard key={c.id} contact={c} typeLabels={TYPE_LABELS} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_130px_130px_80px] gap-2 px-4 py-2.5 border-b border-neutral-100 bg-neutral-50">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('contacts.col.name')}</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('contacts.col.type')}</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('contacts.col.phone')}</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('contacts.col.email')}</p>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('contacts.col.budget')}</p>
          </div>
          <div className="divide-y divide-neutral-50">
            {filtered.map((c) => (
              <ContactRow key={c.id} contact={c} typeLabels={TYPE_LABELS} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card component ─────────────────────────────────────────────────────────────

function ContactCard({ contact: c, typeLabels }: { contact: Contact; typeLabels: Record<string, string> }) {
  const { t } = useI18n()

  return (
    <div className="group relative rounded-2xl border border-neutral-200 bg-white p-4 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/contacts/${c.id}`} className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900 truncate text-sm">{c.name}</h3>
          {(c.preferred_cities ?? []).length > 0 && (
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {(c.preferred_cities ?? []).join(', ')}
            </p>
          )}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          {(() => {
            const days = birthdayDaysLeft(c.date_of_birth)
            return days !== null ? (
              <span className="flex items-center gap-1 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-medium text-pink-700">
                <Cake className="h-2.5 w-2.5" />
                {days === 0 ? t('common.today') : `${t('common.inDays')} ${days}${t('common.days')}`}
              </span>
            ) : null
          })()}
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[c.type]}`}>
            {typeLabels[c.type]}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {c.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="text-xs text-neutral-600 flex-1">{c.phone}</span>
            <a
              href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              title={t('common.whatsapp')}
              className="text-green-600 hover:text-green-700 transition-colors"
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
        {c.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
            <span className="text-xs text-neutral-600 flex-1 truncate">{c.email}</span>
            <a
              href={`mailto:${c.email}`}
              title={t('common.sendEmail')}
              className="text-blue-500 hover:text-blue-600 transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {(c.budget_min || c.budget_max || c.min_rooms) && (
        <div className="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          {(c.budget_min || c.budget_max) && (
            <span className="flex items-center gap-1">
              <Euro className="h-3 w-3 text-neutral-400" />
              {c.budget_min ? c.budget_min.toLocaleString('it-IT') : '0'}
              {' — '}
              {c.budget_max ? c.budget_max.toLocaleString('it-IT') : '∞'}
            </span>
          )}
          {c.min_rooms && (
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3 text-neutral-400" />
              {t('common.minRooms')} {c.min_rooms} {t('common.rooms')}
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
      className="grid grid-cols-[1fr_90px_130px_130px_80px] gap-2 items-center px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-neutral-700">{c.name}</p>
          {days !== null && (
            <span className="flex items-center gap-0.5 rounded-full bg-pink-50 border border-pink-200 px-1.5 py-0.5 text-[9px] font-medium text-pink-700 shrink-0">
              <Cake className="h-2 w-2" />
              {days === 0 ? t('common.today') : `${days}${t('common.days')}`}
            </span>
          )}
        </div>
        {(c.preferred_cities ?? []).length > 0 && (
          <p className="text-xs text-neutral-400 truncate">{(c.preferred_cities ?? []).join(', ')}</p>
        )}
      </div>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TYPE_COLORS[c.type]}`}>
        {typeLabels[c.type]}
      </span>
      <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
        {c.phone ? (
          <>
            <span className="text-xs text-neutral-600 truncate flex-1">{c.phone}</span>
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
          <span className="text-xs text-neutral-300">—</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
        {c.email ? (
          <>
            <span className="text-xs text-neutral-600 truncate flex-1">{c.email}</span>
            <a
              href={`mailto:${c.email}`}
              title={t('common.sendEmail')}
              className="text-blue-500 hover:text-blue-600 transition-colors shrink-0"
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </>
        ) : (
          <span className="text-xs text-neutral-300">—</span>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        {(c.budget_min || c.budget_max)
          ? `€${(c.budget_max ?? c.budget_min)!.toLocaleString('it-IT')}`
          : '—'}
      </p>
    </div>
  )
}
