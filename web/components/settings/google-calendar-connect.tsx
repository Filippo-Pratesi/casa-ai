'use client'

import { CheckCircle2, Calendar, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GoogleCalendarConnectProps {
  isConnected: boolean
  flashMessage?: string
}

export function GoogleCalendarConnect({ isConnected, flashMessage }: GoogleCalendarConnectProps) {
  const router = useRouter()

  async function handleDisconnect() {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ google_access_token: null, google_refresh_token: null, google_token_expiry: null }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {flashMessage === 'connected' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Google Calendar connesso con successo!
        </div>
      )}
      {flashMessage === 'error' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Errore durante la connessione. Riprova.
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-foreground">Google Calendar connesso</span>
          </div>
          <button
            className="flex items-center gap-1.5 h-8 text-xs text-red-600 border border-red-200 rounded-lg px-3 hover:bg-red-50 transition-colors"
            onClick={handleDisconnect}
          >
            Disconnetti
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Non connesso</span>
          </div>
          <a
            href="/api/auth/google-calendar"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[oklch(0.57_0.20_33)] text-white text-xs font-medium h-8 px-3 hover:opacity-90 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Connetti Google Calendar
          </a>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Dopo la connessione, ogni appuntamento creato su CasaAI verrà sincronizzato automaticamente con il tuo Google Calendar.
      </p>
    </div>
  )
}
