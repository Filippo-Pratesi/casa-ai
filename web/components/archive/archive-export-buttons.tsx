'use client'

import { Download } from 'lucide-react'

export function ArchiveExportButtons() {
  function download(type: 'listings' | 'contacts') {
    window.location.href = `/api/archive/export?type=${type}`
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => download('listings')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Esporta immobili
      </button>
      <button
        onClick={() => download('contacts')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Esporta contatti
      </button>
    </div>
  )
}
