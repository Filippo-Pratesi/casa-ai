'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LayoutDashboard, Settings, Users, UserRound, Archive, CreditCard, Megaphone, Bell, CalendarDays, Building2, CheckSquare, Sun, Moon, Search, Receipt, FileText, Database, Euro, BarChart3 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useI18n } from '@/lib/i18n/context'
import type { User, Workspace } from '@/lib/supabase/types'

const SidebarUserMenu = dynamic(
  () => import('@/components/sidebar-user-menu').then(m => m.SidebarUserMenu),
  { ssr: false, loading: () => <div className="h-[52px]" /> }
)

interface AppSidebarProps {
  user: User
  workspace: Workspace
  groupWorkspaces: Workspace[]
  activeWorkspaceId: string
  groupName: string | null
  trialDaysLeft: number | null
  unreadNotifications: number
  birthdayCount: number
  hasGroup?: boolean
  pendingTodos?: number
}

export function AppSidebar({
  user,
  workspace,
  groupWorkspaces,
  activeWorkspaceId,
  groupName,
  trialDaysLeft,
  unreadNotifications,
  birthdayCount,
  hasGroup = false,
  pendingTodos = 0,
}: AppSidebarProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const isAdmin = user.role === 'admin' || user.role === 'group_admin'
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform))
  }, [])
  const isGroupAdmin = user.role === 'group_admin'

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Helper: nav item with optional badge
  function NavItem({ href, icon: Icon, label, badge, exact = true }: { href: string; icon: React.ElementType; label: string; badge?: number | null; exact?: boolean }) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={href} />}
          isActive={active}
          className="group/nav-item h-9 gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-150"
        >
          <Icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover/nav-item:scale-110" />
          <span className="flex-1 truncate">{label}</span>
          {!!badge && badge > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="pb-0 pt-1">
        {isGroupAdmin && groupWorkspaces.length > 0 ? (
          <WorkspaceSwitcher
            workspaces={groupWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            groupName={groupName ?? t('sidebar.group')}
          />
        ) : (
          <div className="flex items-center gap-3 px-3 py-1.5">
            {/* Logo */}
            <div className="shrink-0">
              <img src="/logo.png" alt="CasaAI" className="h-[52px] w-auto object-contain" />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-extrabold leading-tight tracking-tight bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, oklch(0.75 0.16 36), oklch(0.82 0.14 50), oklch(0.70 0.18 33))',
                }}
              >
                CasaAI
              </p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">{workspace.name}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Cmd+K search button */}
        <div className="px-2 pt-0 pb-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Cerca...</span>
            <kbd className="ml-auto text-[10px] font-mono border border-border/50 rounded px-1.5 py-0.5">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
        </div>

        {/* GESTIONE */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {t('nav.gestione')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/dashboard" icon={LayoutDashboard} label={t('nav.listings')} />
              <NavItem href="/banca-dati" icon={Database} label={t('nav.bancaDati')} exact={false} />
              <NavItem href="/analytics" icon={BarChart3} label="Analytics" exact={false} />
              <NavItem href="/listing" icon={Megaphone} label={t('nav.annunci')} exact={false} />
              <NavItem href="/contacts" icon={UserRound} label={t('nav.contacts')} badge={birthdayCount} exact={false} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OPERATIVITÀ */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {t('nav.operativita')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/calendar" icon={CalendarDays} label={t('nav.calendar')} exact={false} />
              {isAdmin && <NavItem href="/campaigns" icon={Megaphone} label={t('nav.campaigns')} exact={false} />}
              <NavItem href="/proposte" icon={FileText} label={t('nav.proposte')} exact={false} />
              <NavItem href="/todos" icon={CheckSquare} label={t('nav.todos')} badge={pendingTodos} exact={false} />
              <NavItem href="/notifications" icon={Bell} label={t('nav.notifications')} badge={unreadNotifications} />
              {hasGroup && <NavItem href="/mls" icon={Building2} label={t('nav.mls')} exact={false} />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AMMINISTRAZIONE */}
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {t('nav.amministrazione')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/contabilita" icon={Euro} label={t('nav.contabilita')} exact={false} />
              <NavItem href="/archive" icon={Archive} label={t('nav.archive')} exact={false} />
              {isAdmin && <NavItem href="/admin" icon={Users} label={t('nav.team')} exact={false} />}
              <NavItem href="/settings" icon={Settings} label={t('nav.settings')} />
              {isAdmin && <NavItem href="/plans" icon={CreditCard} label={t('nav.plan')} />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {trialDaysLeft !== null && isAdmin && (
        <div className="mx-3 mb-2 rounded-xl bg-gradient-to-br from-[oklch(0.95_0.055_33)] to-[oklch(0.95_0.04_45)] border border-[oklch(0.57_0.20_33/0.2)] px-3 py-2.5">
          <p className="text-xs font-semibold text-[oklch(0.40_0.16_33)]">Trial — {trialDaysLeft} {t('trial.message')}</p>
          <Link href="/plans" className="text-xs text-[oklch(0.50_0.18_33)] hover:text-[oklch(0.57_0.20_33)] hover:underline transition-colors">
            {t('trial.cta')}
          </Link>
        </div>
      )}

      <SidebarFooter className="px-2 pb-3">
        <div className="px-2 pb-2 flex items-center gap-2">
          {/* Language switcher — IT / EN text button */}
          <LanguageSwitcher />
          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
            aria-label={theme === 'dark' ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
            aria-pressed={theme === 'dark'}
            className="flex items-center justify-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>
        <SidebarUserMenu
          name={user.name}
          email={user.email}
          avatar_url={user.avatar_url}
          initials={initials}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
