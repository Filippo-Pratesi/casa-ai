'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface GeocodeSuggestion {
  address: string
  city: string
  latitude: number
  longitude: number
  place_name: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: GeocodeSuggestion) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  proximity?: string  // 'lng,lat' format for biasing results to a city
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Cerca indirizzo...',
  disabled = false,
  className,
  proximity,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce and in-flight request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  function handleChange(text: string) {
    onChange(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()
      setLoading(true)
      try {
        const url = `/api/geocode?q=${encodeURIComponent(text)}&country=it${proximity ? `&proximity=${proximity}` : ''}`
        const res = await fetch(url, {
          signal: abortRef.current.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
        setOpen(true)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        // silently fail — user can still type manually
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(suggestion: GeocodeSuggestion) {
    onChange(suggestion.address)
    onSelect(suggestion)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{s.address}</p>
                <p className="text-xs text-muted-foreground">{s.city}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
