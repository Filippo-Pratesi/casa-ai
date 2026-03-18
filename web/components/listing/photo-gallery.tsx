'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

interface PhotoGalleryProps {
  urls: string[]
  floorPlanUrl?: string | null
}

export function PhotoGallery({ urls, floorPlanUrl }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showFloorPlan, setShowFloorPlan] = useState(false)

  if (urls.length === 0 && !floorPlanUrl) return null

  function prev() {
    setLightboxIndex((i) => (i === null ? 0 : (i - 1 + urls.length) % urls.length))
  }

  function next() {
    setLightboxIndex((i) => (i === null ? 0 : (i + 1) % urls.length))
  }

  const allUrls = urls

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setLightboxIndex(i => i === null ? 0 : Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setLightboxIndex(i => i === null ? 0 : Math.min(allUrls.length - 1, i + 1))
      if (e.key === 'Escape') setLightboxIndex(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, allUrls.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'Escape') setLightboxIndex(null)
  }

  const main = urls[0]
  const rest = urls.slice(1, 5) // show up to 4 in the grid

  return (
    <>
      {/* Tabs: Foto / Planimetria */}
      {floorPlanUrl && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setShowFloorPlan(false)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${!showFloorPlan ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Foto
          </button>
          <button
            onClick={() => setShowFloorPlan(true)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${showFloorPlan ? 'bg-[oklch(0.57_0.20_33)] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            Planimetria
          </button>
        </div>
      )}

      {/* Floor plan view */}
      {showFloorPlan && floorPlanUrl ? (
        <div className="rounded-2xl overflow-hidden bg-muted/30 border border-border flex items-center justify-center h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floorPlanUrl}
            alt="Planimetria"
            className="max-h-full max-w-full object-contain p-4"
          />
        </div>
      ) : (
      /* Gallery grid */
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl overflow-hidden h-56 relative">
        {/* Photo count badge */}
        <div className="absolute top-2 left-2 z-10 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white flex items-center gap-1 pointer-events-none">
          <Maximize2 className="h-3 w-3" />
          {urls.length} {urls.length === 1 ? 'foto' : 'foto'}
        </div>

        {/* Main large photo */}
        <button
          className="col-span-2 row-span-2 relative overflow-hidden focus:outline-none cursor-pointer group/main"
          onClick={() => setLightboxIndex(0)}
        >
          <Image
            src={main}
            alt="Foto 1"
            fill
            priority
            loading="eager"
            className="object-cover hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 400px"
          />
          <div className="absolute inset-0 bg-black/0 group-hover/main:bg-black/20 transition-colors flex items-center justify-center">
            <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover/main:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </button>

        {/* Side thumbnails */}
        {rest.map((url, i) => (
          <button
            key={url}
            className="relative overflow-hidden focus:outline-none group/thumb cursor-pointer"
            onClick={() => setLightboxIndex(i + 1)}
          >
            <Image
              src={url}
              alt={`Foto ${i + 2}`}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 25vw, 200px"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-colors" />
            {/* "+N" overlay on last visible thumb */}
            {i === 3 && urls.length > 5 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">+{urls.length - 5}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {urls.length > 1 && (
            <button
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              onClick={(e) => { e.stopPropagation(); prev() }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Lightbox image — use <img> here since lightbox shows full-size arbitrary dimensions */}
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-white">
              {lightboxIndex + 1} / {urls.length} foto
            </span>
          </div>

          {/* Next */}
          {urls.length > 1 && (
            <button
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              onClick={(e) => { e.stopPropagation(); next() }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
