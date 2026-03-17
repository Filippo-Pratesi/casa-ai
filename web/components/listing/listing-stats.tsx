'use client'

import { useState } from 'react'
import { Eye, Share2, Globe, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ListingStatsProps {
  listingId: string
  viewCount: number
  shareCount: number
  portalClickCount: number
}

export function ListingStats({ listingId, viewCount, shareCount, portalClickCount }: ListingStatsProps) {
  const [shares, setShares] = useState(shareCount)
  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    const url = `${window.location.origin}/listing/${listingId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    // Increment share count
    try {
      await fetch(`/api/listing/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_count: shares + 1 }),
      })
      setShares(s => s + 1)
    } catch {
      // silent — copy still worked
    }
    toast.success('Link copiato')
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{viewCount}</span>
        <span className="text-xs text-muted-foreground">visualizzazioni</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{shares}</span>
        <span className="text-xs text-muted-foreground">condivisioni</span>
      </div>

      <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{portalClickCount}</span>
        <span className="text-xs text-muted-foreground">click portale</span>
      </div>

      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 hover:bg-muted/50 transition-colors"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground font-medium">
          {copied ? 'Copiato!' : 'Copia link'}
        </span>
      </button>
    </div>
  )
}
