'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, User, Clock, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { PropertyStageBadge, type PropertyStage } from './property-stage-icon'
import { DispositionIcon, type OwnerDisposition } from './disposition-icon'
import { Card } from '@/components/ui/card'

export interface PropertyCardData {
  id: string
  address: string
  city: string
  zone?: string | null
  sub_zone?: string | null
  stage: PropertyStage
  owner_disposition: OwnerDisposition
  transaction_type?: string | null
  owner_name?: string | null
  agent_name?: string | null
  sqm?: number | null
  rooms?: number | null
  estimated_value?: number | null
  updated_at: string
}

interface PropertyCardProps {
  property: PropertyCardData
  compact?: boolean
  className?: string
}

export function PropertyCard({ property, compact = false, className }: PropertyCardProps) {
  const [pdfLoading, setPdfLoading] = useState(false)

  async function handleDownloadPdf(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/properties/${property.id}/incarico-pdf`)
      if (!res.ok) throw new Error('Errore')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incarico-${property.address.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Link href={`/banca-dati/${property.id}`}>
      <Card className={cn(
        'relative group p-4 hover:shadow-md transition-all duration-200 cursor-pointer',
        'hover:border-primary/20',
        className
      )}>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{property.address}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{property.city}{property.zone ? ` · ${property.zone}` : ''}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <DispositionIcon disposition={property.owner_disposition} />
              <PropertyStageBadge stage={property.stage} />
            </div>
          </div>

          {!compact && (
            <>
              {/* Details row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {property.sqm && <span>{property.sqm} mq</span>}
                {property.rooms && <span>{property.rooms} loc.</span>}
                {property.transaction_type && (
                  <span className={cn(
                    'rounded px-1.5 py-0.5 font-medium',
                    property.transaction_type === 'affitto'
                      ? 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                  )}>
                    {property.transaction_type === 'affitto' ? 'Affitto' : 'Vendita'}
                  </span>
                )}
                {property.estimated_value && (
                  <span className="ml-auto font-semibold text-foreground">
                    €{property.estimated_value.toLocaleString('it-IT')}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                {property.owner_name ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">{property.owner_name}</span>
                  </div>
                ) : <div />}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(property.updated_at), { addSuffix: true, locale: it })}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {property.stage === 'incarico' && (
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            title="Scarica contratto incarico PDF"
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        )}
      </Card>
    </Link>
  )
}
