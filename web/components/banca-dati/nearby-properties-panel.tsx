'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PropertyCard } from './property-card'

interface NearbyProperty {
  id: string
  address: string
  city: string
  zone: string | null
  sub_zone: string | null
  stage: string
  owner_disposition: string
  transaction_type: string | null
  owner_name?: string | null
  updated_at: string
}

interface NearbyPropertiesPanelProps {
  nearby: { same_building: NearbyProperty[]; nearby: NearbyProperty[] } | null
  loading?: boolean
}

export const NearbyPropertiesPanel = React.memo(function NearbyPropertiesPanel({
  nearby,
  loading = false,
}: NearbyPropertiesPanelProps) {
  const hasNearby = nearby && (nearby.same_building.length > 0 || nearby.nearby.length > 0)

  if (!loading && !hasNearby) return null

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-semibold text-sm">Immobili già noti nelle vicinanze</h2>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cercando immobili vicini...
        </div>
      ) : (
        <>
          {(nearby?.same_building ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stesso edificio</p>
              <div className="grid gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(nearby?.same_building ?? []).map((p: any) => (
                  <PropertyCard key={p.id} property={p} compact />
                ))}
              </div>
            </div>
          )}
          {(nearby?.nearby ?? []).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entro 100 metri</p>
              <div className="grid gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(nearby?.nearby ?? []).map((p: any) => (
                  <PropertyCard key={p.id} property={p} compact />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
})
