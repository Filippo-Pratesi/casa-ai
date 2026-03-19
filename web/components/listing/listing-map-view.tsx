'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MapPin, ExternalLink, Euro, Maximize2, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ListingMapViewProps {
  listings: ListingMapPoint[]
}

const TYPE_LABELS: Record<string, string> = {
  vendita: 'Vendita',
  affitto: 'Affitto',
}

// Popup content shown when a marker is clicked
function Popup({ listing, onClose }: { listing: ListingMapPoint; onClose: () => void }) {
  return (
    <div className="absolute z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-56 space-y-2"
      style={{ transform: 'translate(-50%, calc(-100% - 12px))' }}
    >
      <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      <p className="text-sm font-semibold leading-tight pr-4">{listing.address}</p>
      <p className="text-xs text-muted-foreground">{listing.city}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Euro className="h-3 w-3" />€{listing.price.toLocaleString('it-IT')}</span>
        <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{listing.sqm} m²</span>
      </div>
      {listing.transaction_type && (
        <span className={cn(
          'inline-flex text-[10px] font-semibold rounded-full px-2 py-0.5',
          listing.transaction_type === 'affitto'
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        )}>
          {TYPE_LABELS[listing.transaction_type] ?? listing.transaction_type}
        </span>
      )}
      <Link
        href={`/listing/${listing.id}`}
        className="flex items-center gap-1 text-xs text-[oklch(0.57_0.20_33)] hover:underline font-medium"
      >
        <ExternalLink className="h-3 w-3" />
        Vai all&apos;annuncio
      </Link>
    </div>
  )
}

export function ListingMapView({ listings }: ListingMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  const [selected, setSelected] = useState<{ listing: ListingMapPoint; x: number; y: number } | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if (!token) { setError('NEXT_PUBLIC_MAPBOX_TOKEN non configurato'); return }

    // Dynamic import to avoid SSR issues
    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = token

      // Center on Italy or on listings centroid
      const avgLat = listings.length > 0 ? listings.reduce((s, l) => s + l.lat, 0) / listings.length : 41.9
      const avgLng = listings.length > 0 ? listings.reduce((s, l) => s + l.lng, 0) / listings.length : 12.5

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [avgLng, avgLat],
        zoom: listings.length === 1 ? 14 : 10,
      })

      mapRef.current = map

      map.on('load', () => {
        setMapLoaded(true)

        // Add markers for each listing
        listings.forEach((listing) => {
          const el = document.createElement('div')
          el.className = 'listing-marker'
          el.style.cssText = `
            width: 28px; height: 28px;
            background: oklch(0.57 0.20 33);
            border: 2px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          `

          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([listing.lng, listing.lat])
            .addTo(map)

          el.addEventListener('click', () => {
            const pos = map.project([listing.lng, listing.lat])
            setSelected({ listing, x: pos.x, y: pos.y })
          })
        })

        // Fit bounds if multiple listings
        if (listings.length > 1) {
          const bounds = listings.reduce((b, l) => b.extend([l.lng, l.lat]), new mapboxgl.LngLatBounds([listings[0].lng, listings[0].lat], [listings[0].lng, listings[0].lat]))
          map.fitBounds(bounds, { padding: 60, maxZoom: 15 })
        }
      })
    }).catch(() => setError('Impossibile caricare la mappa'))

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [token, listings])

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 rounded-2xl border border-border bg-muted text-muted-foreground gap-2 text-sm">
        <MapPin className="h-5 w-5" />
        {error}
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: '500px' }}>
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4 animate-pulse" />
            Caricamento mappa…
          </div>
        </div>
      )}

      {/* Popup */}
      {selected && (
        <div
          className="absolute"
          style={{ left: selected.x, top: selected.y, pointerEvents: 'none' }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <Popup listing={selected.listing} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground border border-border/60">
        {listings.length} annunci con posizione
      </div>
    </div>
  )
}
