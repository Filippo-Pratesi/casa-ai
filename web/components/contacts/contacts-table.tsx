'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Cake, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { ContactTypeBadges } from './contact-type-badges'
import type { SortKey } from './contacts-filters'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'
import { birthdayDaysLeft } from '@/lib/contact-utils'

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
