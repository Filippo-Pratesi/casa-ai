'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Instagram, Facebook, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface SocialPublishButtonsProps {
  listingId: string
  hasPhotos: boolean
  instagramConnected: boolean
  facebookConnected: boolean
}

type PublishStatus = 'idle' | 'loading' | 'published' | 'failed'

export function SocialPublishButtons({
  listingId,
  hasPhotos,
  instagramConnected,
  facebookConnected,
}: SocialPublishButtonsProps) {
  const [igStatus, setIgStatus] = useState<PublishStatus>('idle')
  const [fbStatus, setFbStatus] = useState<PublishStatus>('idle')
  const router = useRouter()

  async function publish(platform: 'instagram' | 'facebook') {
    const setStatus = platform === 'instagram' ? setIgStatus : setFbStatus
    setStatus('loading')

    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, platform }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore nella pubblicazione')
      setStatus('published')
      toast.success(`Pubblicato su ${platform === 'instagram' ? 'Instagram' : 'Facebook'}!`)
    } catch (err) {
      setStatus('failed')
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
    }
  }

  const platforms = [
    {
      key: 'instagram' as const,
      label: 'Instagram',
      icon: Instagram,
      connected: instagramConnected,
      status: igStatus,
      requiresPhotos: true,
    },
    {
      key: 'facebook' as const,
      label: 'Facebook',
      icon: Facebook,
      connected: facebookConnected,
      status: fbStatus,
      requiresPhotos: false,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map(({ key, label, icon: Icon, connected, status, requiresPhotos }) => {
        const disabled = status === 'loading' || status === 'published'
        const noPhotosWarning = requiresPhotos && !hasPhotos

        if (!connected) {
          return (
            <button
              key={key}
              // A6: use SPA navigation instead of hard redirect
              onClick={() => router.push('/settings')}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              Connetti {label}
            </button>
          )
        }

        const setStatus = key === 'instagram' ? setIgStatus : setFbStatus
        return (
          <button
            key={key}
            // B3: failed state is clickable (resets to idle for retry); only loading/published disables
            disabled={disabled || noPhotosWarning}
            onClick={status === 'failed' ? () => setStatus('idle') : () => publish(key)}
            title={noPhotosWarning ? 'Instagram richiede almeno una foto' : undefined}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
              status === 'published'
                ? 'border-border bg-muted text-muted-foreground'
                : status === 'failed'
                ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900'
                : 'border-border bg-card text-foreground hover:bg-muted/50'
            }`}
          >
            {status === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === 'published' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : status === 'failed' ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {status === 'published'
              ? 'Pubblicato'
              : status === 'loading'
              ? 'Pubblicazione...'
              : status === 'failed'
              ? 'Errore — clicca per riprovare'
              : `Pubblica su ${label}`}
          </button>
        )
      })}
    </div>
  )
}
