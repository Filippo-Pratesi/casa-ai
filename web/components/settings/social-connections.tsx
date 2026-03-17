'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Instagram, Facebook, ExternalLink, Unlink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Connection {
  id: string
  platform: string
  page_name: string | null
  page_id: string
}

interface SocialConnectionsProps {
  connections: Connection[]
}

const PLATFORM_META = {
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
  },
}

export function SocialConnections({ connections: initialConnections }: SocialConnectionsProps) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function connectPlatform(platform: string) {
    // Redirect to OAuth initiation endpoint
    window.location.href = `/api/social/connect?platform=${platform}`
  }

  function disconnect(connectionId: string, platform: string) {
    setDisconnecting(connectionId)
    startTransition(async () => {
      try {
        const res = await fetch('/api/social/disconnect', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connection_id: connectionId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Errore')
        setConnections((prev) => prev.filter((c) => c.id !== connectionId))
        toast.success(`${PLATFORM_META[platform as keyof typeof PLATFORM_META]?.label ?? platform} disconnesso`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
      } finally {
        setDisconnecting(null)
      }
    })
  }

  const platforms = ['instagram', 'facebook'] as const

  return (
    <div className="space-y-3">
      {platforms.map((platform) => {
        const meta = PLATFORM_META[platform]
        const Icon = meta.icon
        const connected = connections.filter((c) => c.platform === platform)

        return (
          <div key={platform} className="rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>
                <div>
                  <p className="font-medium">{meta.label}</p>
                  {connected.length > 0 ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs text-neutral-500">
                        {connected.map((c) => c.page_name ?? c.page_id).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 mt-0.5">Non connesso</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {connected.length > 0 ? (
                  <>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connesso</Badge>
                    {connected.map((c) => (
                      <Button
                        key={c.id}
                        variant="ghost"
                        size="sm"
                        disabled={disconnecting === c.id}
                        onClick={() => disconnect(c.id, platform)}
                        className="text-neutral-500 gap-1.5"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        Disconnetti
                      </Button>
                    ))}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => connectPlatform(platform)}
                    className="gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Connetti
                  </Button>
                )}
              </div>
            </div>

            {connected.length === 0 && (
              <p className="text-xs text-neutral-400 mt-3 pl-[52px]">
                {platform === 'instagram'
                  ? 'Collega il tuo account Instagram Business per pubblicare direttamente dall\'app.'
                  : 'Collega la tua Pagina Facebook per pubblicare post con un clic.'}
              </p>
            )}
          </div>
        )
      })}

      <p className="text-xs text-neutral-400 pt-1">
        Ogni agente può connettere i propri account social. I token sono cifrati e usati solo per pubblicare contenuti da questa app.
      </p>
    </div>
  )
}
