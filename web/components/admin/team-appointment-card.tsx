'use client'

import React from 'react'
import { Clock, Phone } from 'lucide-react'
import { type TeamAppointment, type TeamAgent, type AGENT_PALETTE, getInitials, formatTime } from './team-calendar-types'

interface TeamAppointmentCardProps {
  appt: TeamAppointment
  agent: TeamAgent | undefined
  palette: typeof AGENT_PALETTE[0] | undefined
}

export const TeamAppointmentCard = React.memo(function TeamAppointmentCard({ appt, agent, palette }: TeamAppointmentCardProps) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${palette?.light ?? 'bg-muted/50 border-border'}`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${palette?.bg ?? 'bg-muted-foreground'}`}>
          {getInitials(agent?.name ?? '?')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{appt.title}</p>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-70">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatTime(appt.starts_at)}
              {appt.ends_at && ` – ${formatTime(appt.ends_at)}`}
            </span>
          </div>
          {appt.contact_name && (
            <p className="flex items-center gap-0.5 text-[10px] opacity-60 mt-0.5 truncate">
              <Phone className="h-2.5 w-2.5 shrink-0" />
              {appt.contact_name}
            </p>
          )}
          <p className="text-[10px] opacity-50 mt-0.5">{agent?.name}</p>
        </div>
      </div>
    </div>
  )
})
