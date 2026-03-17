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
    <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b border-neutral-100 bg-white/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="h-7 w-7 shrink-0 text-neutral-400 hover:text-neutral-700" />
      <div className="h-4 w-px bg-neutral-200" />
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-neutral-300" />}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-neutral-800">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-neutral-400 hover:text-neutral-700 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
