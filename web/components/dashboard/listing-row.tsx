'use client'

import React from 'react'
import Link from 'next/link'
import { Pencil, ExternalLink } from 'lucide-react'
import { TYPE_COLORS, formatDate } from './dashboard-types'
import type { Listing } from './dashboard-types'

export const ListingRow = React.memo(function ListingRow({ listing: l, typeLabels, draftLabel }: { listing: Listing; typeLabels: Record<string, string>; draftLabel: string }) {
  return (
    <div className="grid grid-cols-[1fr_100px_90px_90px_70px_90px_80px_50px] gap-2 items-center px-4 py-3 hover:bg-muted/40 transition-all duration-150 group">
      <Link href={`/listing/${l.id}`} className="min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-[oklch(0.57_0.20_33)] transition-colors">{l.address}</p>
        <p className="text-xs text-muted-foreground truncate">{l.city}</p>
      </Link>
      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium w-fit ${TYPE_COLORS[l.property_type] ?? 'bg-muted text-muted-foreground border-border'}`}>
        {typeLabels[l.property_type]}
      </span>
      <p className="text-xs font-semibold text-right">€{l.price.toLocaleString('it-IT')}</p>
      <p className="text-xs text-muted-foreground text-right">{l.sqm} m² · {l.rooms}</p>
      <span>
        {l.generated_content
          ? <span className="rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.15)] text-[oklch(0.45_0.18_33)] px-2 py-0.5 text-[10px] font-semibold border border-[oklch(0.57_0.20_33/0.2)]">✦ AI</span>
          : <span className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium">{draftLabel}</span>
        }
      </span>
      <p className="text-xs text-muted-foreground">{formatDate(l.created_at)}</p>
      <p className="text-xs text-muted-foreground truncate">{l.agent?.name ?? '—'}</p>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <Link href={`/listing/${l.id}/edit`}><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></Link>
        <Link href={`/listing/${l.id}`}><ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></Link>
      </div>
    </div>
  )
})
