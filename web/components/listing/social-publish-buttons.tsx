'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Instagram, Facebook, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = '/settings')}
              className="gap-1.5 text-neutral-500"
            >
              <Icon className="h-3.5 w-3.5" />
              Connetti {label}
            </Button>
          )
        }

        return (
          <Button
            key={key}
            variant={status === 'published' ? 'secondary' : 'outline'}
            size="sm"
            disabled={disabled || noPhotosWarning}
            onClick={() => publish(key)}
            title={noPhotosWarning ? 'Instagram richiede almeno una foto' : undefined}
            className="gap-1.5"
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
              ? 'Riprova'
              : `Pubblica su ${label}`}
          </Button>
        )
      })}
    </div>
  )
}
