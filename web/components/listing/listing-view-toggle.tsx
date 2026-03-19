'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { LayoutGrid, Map } from 'lucide-react'

// Dynamic import to avoid SSR issues with mapbox-gl
const ListingMapView = dynamic(
  () => import('./listing-map-view').then(m => m.ListingMapView),
  { ssr: false, loading: () => <div className="h-[500px] rounded-2xl border border-border bg-muted animate-pulse" /> }
)

interface ListingMapPoint {
  id: string
  address: string
  city: string
  price: number
  sqm: number
  lat: number
  lng: number
  transaction_type: string | null
}

interface ListingViewToggleProps {
  mapListings: ListingMapPoint[]
  children: React.ReactNode   // the grid view (server-rendered cards)
}

export function ListingViewToggle({ mapListings, children }: ListingViewToggleProps) {
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const hasMapData = mapListings.length > 0

  return (
    <div className="space-y-4">
      {/* View toggle — only show if there's map data */}
      {hasMapData && (
        <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden w-fit">
          <button
            onClick={() => setView('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Griglia
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'map' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Map className="h-3.5 w-3.5" />
            Mappa
          </button>
        </div>
      )}

      {view === 'grid' ? (
        <>{children}</>
      ) : (
        <ListingMapView listings={mapListings} />
      )}
    </div>
  )
}
