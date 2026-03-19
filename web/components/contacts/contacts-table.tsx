'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Cake, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { ContactTypeBadges } from './contact-type-badges'
import type { SortKey } from './contacts-filters'

// WhatsApp SVG icon (official brand icon)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-label="WhatsApp">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: string
  types: string[] | null
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
  const todayMidnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const [, mm, dd] = dob.split('-').map(Number)
  let next = new Date(now.getFullYear(), mm - 1, dd)
  if (next.getTime() < todayMidnightMs) next = new Date(now.getFullYear() + 1, mm - 1, dd)
  const diff = Math.ceil((next.getTime() - todayMidnightMs) / 86400000)
  return diff <= 7 ? diff : null
}

// ── Row component (table view) ─────────────────────────────────────────────────
// Note: uses div+onClick instead of Link to avoid nested <a> hydration error
// (WhatsApp and mailto links are <a> tags inside, so outer must NOT be <a>)

function ContactRow({ contact: c }: { contact: Contact }) {
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
      <div className="flex flex-col gap-0.5">
        <ContactTypeBadges types={c.types} type={c.type} size="xs" />
      </div>
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

interface ContactsTableProps {
  contacts: Contact[]
  sortBy: SortKey
  onSortByChange: (value: SortKey) => void
}

export const ContactsTable = React.memo(function ContactsTable({
  contacts,
  sortBy,
  onSortByChange,
}: ContactsTableProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-[1fr_80px_120px_120px_80px_110px_110px] gap-2 px-4 py-2.5 border-b border-border bg-muted/50">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.name')}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.type')}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.phone')}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('contacts.col.email')}</p>
        <button
          onClick={() => onSortByChange(sortBy === 'budget_desc' ? 'budget_asc' : 'budget_desc')}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {t('contacts.col.budget')}
          {sortBy === 'budget_desc' ? <ArrowDown className="h-3 w-3" /> : sortBy === 'budget_asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
        <button
          onClick={() => onSortByChange(sortBy === 'date_desc' ? 'date_asc' : 'date_desc')}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          Aggiunto
          {sortBy === 'date_desc' ? <ArrowDown className="h-3 w-3" /> : sortBy === 'date_asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Da chi</p>
      </div>
      <div className="divide-y divide-border">
        {contacts.map((c) => (
          <ContactRow key={c.id} contact={c} />
        ))}
      </div>
    </div>
  )
})
