'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import type { Listing, Contact, Agent, Appointment } from './calendar-types'
import { TYPE_COLORS } from './calendar-types'

// ── Appointment Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  listings: Listing[]
  contacts: Contact[]
  agents?: Agent[]
  currentUserId: string
  initial?: { date?: Date }
  editing?: Appointment
  onClose: () => void
  onSaved: () => void
}

export const AppointmentModal = React.memo(function AppointmentModal({ listings, contacts, agents, currentUserId, initial, editing, onClose, onSaved }: ModalProps) {
  const { t } = useI18n()
  const typeLabels: Record<string, string> = {
    acquisizione: t('calendar.type.acquisizione'),
    riunione: t('calendar.type.riunione'),
    atto: t('calendar.type.atto'),
    visita: t('calendar.type.visita'),
    altro: t('calendar.type.altro'),
  }
  const defaultDate = initial?.date ?? new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [title, setTitle] = useState(editing?.title ?? '')
  const [type, setType] = useState<Appointment['type']>(editing?.type ?? 'visita')
  const [date, setDate] = useState(editing ? toDateInput(new Date(editing.starts_at)) : toDateInput(defaultDate))
  const [startTime, setStartTime] = useState(editing ? toTimeInput(new Date(editing.starts_at)) : '09:00')
  const [endTime, setEndTime] = useState(editing?.ends_at ? toTimeInput(new Date(editing.ends_at)) : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [contactId, setContactId] = useState(editing?.contact_id ?? '')
  const [listingId, setListingId] = useState(editing?.listing_id ?? '')
  const [assignedAgentId, setAssignedAgentId] = useState(currentUserId)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date || !startTime) return
    setLoading(true)
    try {
      const starts_at = new Date(`${date}T${startTime}:00`).toISOString()
      const ends_at = endTime ? new Date(`${date}T${endTime}:00`).toISOString() : null
      const selectedContact = contacts.find(c => c.id === contactId)
      const body: Record<string, unknown> = {
        title: title.trim(),
        type,
        starts_at,
        ends_at,
        notes: notes.trim() || null,
        contact_id: contactId || null,
        contact_name: selectedContact?.name ?? null,
        listing_id: listingId || null,
        agent_id: assignedAgentId || null,
      }
      const url = editing ? `/api/appointments/${editing.id}` : '/api/appointments'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? 'Errore nel salvataggio')
        return
      }
      toast.success(editing ? 'Appuntamento aggiornato' : 'Appuntamento creato')
      onSaved()
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            {editing ? t('calendar.modal.editAppt') : t('calendar.modal.newAppt')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.title')}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder={t('calendar.modal.titlePlaceholder')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('calendar.modal.type')}</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(typeLabels) as Array<Appointment['type']>).map(apptType => (
                <button
                  key={apptType}
                  type="button"
                  onClick={() => setType(apptType)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    type === apptType ? TYPE_COLORS[apptType] : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {typeLabels[apptType]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.date')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.start')}</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.end')}</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          {contacts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.client')}</label>
              <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">{t('calendar.modal.none')}</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {listings.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.listing')}</label>
              <select value={listingId} onChange={e => setListingId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">{t('calendar.modal.none')}</option>
                {listings.map(l => <option key={l.id} value={l.id}>{l.address}, {l.city}</option>)}
              </select>
            </div>
          )}
          {agents && agents.length > 1 && !editing && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.assignTo')}</label>
              <select value={assignedAgentId} onChange={e => setAssignedAgentId(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}{a.id === currentUserId ? t('calendar.modal.you') : ''}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t('calendar.modal.notes')}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={t('calendar.modal.notesPlaceholder')} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder-muted-foreground resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="flex-1 h-9 text-sm">
              {loading ? t('calendar.modal.saving') : editing ? t('calendar.modal.update') : t('calendar.modal.create')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-sm px-4">{t('calendar.modal.cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  )
})
