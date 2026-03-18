'use client'

import { useState, useEffect } from 'react'
import { Bell, Cake, CheckSquare, CalendarDays, Save } from 'lucide-react'
import { toast } from 'sonner'

const PREF_KEY = 'casaai_notification_prefs'

interface NotificationPrefs {
  birthday: boolean
  todo_assigned: boolean
  appointment_assigned: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  birthday: true,
  todo_assigned: true,
  appointment_assigned: true,
}

interface PrefRow {
  key: keyof NotificationPrefs
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  desc: string
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY)
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) })
    } catch {
      // ignore
    }
  }, [])

  function toggle(key: keyof NotificationPrefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  function handleSave() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
      toast.success('Preferenze notifiche salvate')
      setSaved(true)
    } catch {
      toast.error('Errore nel salvataggio')
    }
  }

  const rows: PrefRow[] = [
    {
      key: 'birthday',
      icon: Cake,
      iconColor: 'text-pink-500',
      iconBg: 'bg-pink-100',
      title: 'Compleanni clienti',
      desc: 'Ricevi una notifica il giorno del compleanno dei tuoi clienti con un messaggio AI pronto all\'uso.',
    },
    {
      key: 'todo_assigned',
      icon: CheckSquare,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
      title: 'Task assegnati',
      desc: 'Ricevi una notifica quando un collega ti assegna un task da completare.',
    },
    {
      key: 'appointment_assigned',
      icon: CalendarDays,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
      title: 'Appuntamenti assegnati',
      desc: 'Ricevi una notifica quando un admin ti assegna un appuntamento nel calendario.',
    },
  ]

  return (
    <div className="space-y-4">
      {rows.map(({ key, icon: Icon, iconColor, iconBg, title, desc }) => (
        <div key={key} className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-4">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          <button
            type="button"
            onClick={() => toggle(key)}
            className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors ${
              prefs[key]
                ? 'border-[oklch(0.57_0.20_33)] bg-[oklch(0.57_0.20_33)]'
                : 'border-border bg-muted'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                prefs[key] ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      ))}

      <button onClick={handleSave} className="btn-ai disabled:opacity-60">
        <Save className="h-4 w-4" />
        {saved ? 'Salvato' : 'Salva preferenze'}
      </button>
    </div>
  )
}
