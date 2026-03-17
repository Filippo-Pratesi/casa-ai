'use client'

import { useState } from 'react'
import { Cake, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface BirthdayCardProps {
  contactId: string
  contactName: string
  daysLeft: number
}

export function BirthdayCard({ contactId, contactName, daysLeft }: BirthdayCardProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/birthday-message`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Errore nella generazione del messaggio')
        return
      }
      setMessage(data.message)
      toast.success('Messaggio generato e salvato nelle notifiche agente')
    } catch {
      toast.error('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copiato negli appunti')
  }

  const label = daysLeft === 0 ? 'Oggi!' : `tra ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}`

  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-pink-800">
              Compleanno di {contactName}
            </p>
            <p className="text-xs text-pink-500">{label}</p>
          </div>
        </div>
        {!message && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={loading}
            className="shrink-0 border-pink-200 text-pink-700 hover:bg-pink-100 hover:border-pink-300 h-8 text-xs"
          >
            {loading ? (
              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Genero…</>
            ) : (
              'Genera messaggio'
            )}
          </Button>
        )}
      </div>

      {message && (
        <div className="rounded-xl bg-white border border-pink-100 px-4 py-3 space-y-2">
          <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{message}</p>
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-neutral-400">Copia e invia via email, WhatsApp o di persona</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiato' : 'Copia'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs text-pink-500 hover:text-pink-700 transition-colors"
        >
          {loading ? 'Genero…' : '↻ Rigenera'}
        </button>
      )}
    </div>
  )
}
