'use client'

import React from 'react'
import {
  X,
  Check,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Calendar,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { Appointment, Listing } from './calendar-types'
import { TYPE_COLORS, TYPE_DOT, formatTime } from './calendar-types'

// ── Appointment Card ──────────────────────────────────────────────────────────

interface CardProps {
  appt: Appointment
  listings: Listing[]
  agentColor?: string
  onStatusChange: (id: string, status: Appointment['status']) => void
  onEdit: (appt: Appointment) => void
  onDelete: (id: string) => void
}

export const AppointmentCard = React.memo(function AppointmentCard({ appt, listings, agentColor, onStatusChange, onEdit, onDelete }: CardProps) {
  const { t } = useI18n()
  const listing = appt.listing_id ? listings.find(l => l.id === appt.listing_id) : null
  const isCancelled = appt.status === 'cancelled'
  const isCompleted = appt.status === 'completed'
  const colorClass = agentColor ?? TYPE_COLORS[appt.type]

  return (
    <div className={`rounded-2xl border px-4 py-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isCancelled ? 'opacity-50' : ''} ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[appt.type]}`} />
            <span className="text-xs font-medium opacity-80">{t(`calendar.type.${appt.type}`)}</span>
          </div>
          <p className={`text-sm font-semibold truncate ${isCancelled ? 'line-through' : ''}`}>{appt.title}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs opacity-70">
              <Clock className="h-3 w-3" />
              {formatTime(appt.starts_at)}
              {appt.ends_at && ` – ${formatTime(appt.ends_at)}`}
            </span>
            {appt.contact_name && (
              <span className="flex items-center gap-1 text-xs opacity-70 truncate">
                <Phone className="h-3 w-3 shrink-0" />
                {appt.contact_name}
              </span>
            )}
          </div>
          {listing && (
            <span className="flex items-center gap-1 text-xs opacity-70 mt-0.5 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {listing.address}
            </span>
          )}
          {appt.notes && <p className="text-xs opacity-60 mt-1 line-clamp-1">{appt.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {appt.status === 'scheduled' && (
            <>
              <button onClick={() => onStatusChange(appt.id, 'completed')} title="Completato" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onStatusChange(appt.id, 'cancelled')} title="Annulla" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {(isCompleted || isCancelled) && (
            <button onClick={() => onStatusChange(appt.id, 'scheduled')} title="Ripristina" className="rounded-lg p-1 hover:bg-black/10 transition-colors text-xs font-medium opacity-60">↩</button>
          )}
          <button onClick={() => onEdit(appt)} title="Modifica" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
            <Calendar className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(appt.id)} title="Elimina" className="rounded-lg p-1 hover:bg-black/10 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})
