'use client'

import React, { useState, useRef } from 'react'
import { Calendar, X } from 'lucide-react'
import { todayISO, tomorrowISO, nextWeekISO, fmtDate } from './todo-types'

function QuickDatePickerInner({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCustom, setShowCustom] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  const presets = [
    { label: 'Oggi',   value: todayISO() },
    { label: 'Domani', value: tomorrowISO() },
    { label: '+7 gg',  value: nextWeekISO() },
  ]

  function handlePreset(v: string) {
    if (value === v) {
      onChange('')        // deselect
      setShowCustom(false)
    } else {
      onChange(v)
      setShowCustom(false)
    }
  }

  function handleCustomClick() {
    setShowCustom(true)
    setTimeout(() => dateRef.current?.showPicker?.(), 50)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {presets.map(p => (
        <button
          key={p.label}
          type="button"
          onClick={() => handlePreset(p.value)}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors border ${
            value === p.value
              ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
              : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
          }`}
        >
          {p.label}
        </button>
      ))}
      {/* Custom date button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleCustomClick}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors border ${
            value && !presets.find(p => p.value === value)
              ? 'bg-[oklch(0.57_0.20_33)] text-white border-[oklch(0.57_0.20_33)]'
              : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
          }`}
        >
          {value && !presets.find(p => p.value === value) ? fmtDate(value) : 'Altra data'}
        </button>
        <input
          ref={dateRef}
          type="date"
          value={value}
          onChange={e => { onChange(e.target.value); setShowCustom(false) }}
          className={`absolute inset-0 opacity-0 cursor-pointer ${showCustom ? '' : 'pointer-events-none'}`}
          min={todayISO()}
        />
      </div>
      {/* Clear */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Rimuovi data"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

export const QuickDatePicker = React.memo(QuickDatePickerInner)
