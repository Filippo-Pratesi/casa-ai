import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] shadow-xl shadow-[oklch(0.57_0.20_33/0.3)] mx-auto">
              <Home className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-md">
              404
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Pagina non trovata</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            La pagina che stai cercando non esiste o è stata spostata.
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-[oklch(0.57_0.20_33)] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[oklch(0.52_0.20_33)] transition-colors shadow-md shadow-[oklch(0.57_0.20_33/0.25)]"
          >
            <Home className="h-4 w-4" />
            Torna alla Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Link>
        </div>

        {/* Brand */}
        <p className="text-xs text-muted-foreground/50">CasaAI — Gestionale Immobiliare</p>
      </div>
    </div>
  )
}
