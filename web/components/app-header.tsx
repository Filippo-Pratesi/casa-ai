'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  listing: 'Annunci',
  contacts: 'Clienti',
  new: 'Nuovo',
  edit: 'Modifica',
  settings: 'Impostazioni',
  admin: 'Panoramica team',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href: string }[] = []

  let path = ''
  for (const segment of segments) {
    path += `/${segment}`
    // Skip UUIDs — show them as "Dettaglio"
    const isUuid = /^[0-9a-f-]{36}$/.test(segment)
    const label = isUuid ? 'Dettaglio' : (BREADCRUMB_MAP[segment] ?? segment)
    crumbs.push({ label, href: path })
  }
  return crumbs
}

export function AppHeader() {
  const pathname = usePathname()
  const crumbs = getBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/90 backdrop-blur-md px-5 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      <SidebarTrigger className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150" />
      <div className="h-5 w-px bg-border" />
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
            {i === crumbs.length - 1 ? (
              <span className="font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
