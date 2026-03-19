'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { GeneratedContent } from '@/lib/supabase/types'

interface OutputTabsProps {
  listingId: string
  initialContent: GeneratedContent
}

const TABS: { key: keyof GeneratedContent; label: string }[] = [
  { key: 'listing_it', label: '🇮🇹 Annuncio IT' },
  { key: 'listing_en', label: '🇬🇧 Annuncio EN' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
]

export function OutputTabs({ listingId, initialContent }: OutputTabsProps) {
  const [content, setContent] = useState<GeneratedContent>(initialContent)
  const [copied, setCopied] = useState<keyof GeneratedContent | null>(null)
  const [regenerating, setRegenerating] = useState<keyof GeneratedContent | null>(null)

  async function copyTab(key: keyof GeneratedContent) {
    try {
      await navigator.clipboard.writeText(content[key])
      setCopied(key)
      toast.success('Copiato negli appunti')
      setTimeout(() => setCopied(null), 3000)
    } catch {
      toast.error('Copia non riuscita')
    }
  }

  async function regenerate(key: keyof GeneratedContent) {
    setRegenerating(key)
    try {
      const res = await fetch(`/api/listing/${listingId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore nella rigenerazione')
      setContent(data.generated_content as GeneratedContent)
      toast.success('Contenuto rigenerato')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setRegenerating(null)
    }
  }

  return (
    <Tabs defaultValue="listing_it" className="w-full">
      <TabsList className="flex-wrap h-auto gap-1 w-full">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium">{t.label}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => regenerate(t.key)}
                  disabled={regenerating === t.key}
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${regenerating === t.key ? 'animate-spin' : ''}`}
                  />
                  Rigenera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyTab(t.key)}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copied === t.key ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied === t.key ? 'Copiato' : 'Copia'}
                </Button>
              </div>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {regenerating === t.key ? (
                  <span className="text-muted-foreground italic">Rigenerazione in corso...</span>
                ) : (
                  content[t.key]
                )}
              </pre>
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
