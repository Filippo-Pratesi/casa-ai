'use client'

import React from 'react'
import Link from 'next/link'
import { Sparkles, Maximize2, Home, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/context'
import { PLACEHOLDER_GRADIENTS, formatDate } from './dashboard-types'
import type { Listing } from './dashboard-types'

export const ListingCard = React.memo(function ListingCard({ listing: l, typeLabels }: { listing: Listing; typeLabels: Record<string, string> }) {
  const { t } = useI18n()
  const thumb = Array.isArray(l.photos_urls) && l.photos_urls.length > 0 ? l.photos_urls[0] : null
  const placeholderGradient = PLACEHOLDER_GRADIENTS[l.property_type] ?? PLACEHOLDER_GRADIENTS.other

  return (
    <Link href={`/listing/${l.id}`} className="group block rounded-2xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm card-lift min-h-[280px] flex flex-col">
        {/* Image area */}
        <div className="relative h-44 w-full overflow-hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={l.address} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            /* Type-specific gradient placeholder */
            <div className={`flex h-full w-full bg-gradient-to-br ${placeholderGradient} relative overflow-hidden`}
              style={{ background: `linear-gradient(135deg, oklch(0.94 0.06 33), oklch(0.92 0.04 45), oklch(0.95 0.05 55))` }}
            >
              {/* Subtle pattern overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle at 25% 25%, oklch(0.57 0.20 33 / 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, oklch(0.66 0.15 188 / 0.2) 0%, transparent 50%)',
                }}
              />
              {/* Small corner icon badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-sm p-1.5 shadow-sm">
                <Home className="h-6 w-6 text-[oklch(0.57_0.20_33/0.7)]" />
              </div>
              {/* Property type badge top-left below icon */}
              <div className="absolute top-12 left-2.5">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/70 text-foreground border-0 backdrop-blur-sm">
                  {typeLabels[l.property_type]}
                </Badge>
              </div>
            </div>
          )}
          {/* Gradient overlay — stronger for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

          {/* Glass price badge */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center gap-1 rounded-xl bg-black/40 backdrop-blur-xl px-3 py-1.5 text-sm font-bold text-white border border-white/15 shadow-lg">
              €{l.price.toLocaleString('it-IT')}
            </span>
          </div>

          {/* AI / Draft badge */}
          <div className="absolute top-2.5 right-2.5">
            {l.generated_content ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-[oklch(0.57_0.20_33/0.4)]">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/80 border border-white/10">
                {t('listings.badge.draft')}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 space-y-2.5 flex-1 flex flex-col">
          <div className="flex-1">
            <h3 className="font-bold truncate text-sm leading-snug tracking-tight">{l.address}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {typeLabels[l.property_type]} · {l.city}
              {l.property_type === 'apartment' && l.floor != null ? ` · Piano ${l.floor}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {l.sqm} m²
            </span>
            <span className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              {l.rooms} {t('common.rooms')}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {l.agent?.name ?? 'Non assegnato'}
            </span>
            {l.generated_content ? (
              <span className="ai-badge">
                <Sparkles className="h-2 w-2" />
                CasaAI
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">{formatDate(l.created_at)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
})
