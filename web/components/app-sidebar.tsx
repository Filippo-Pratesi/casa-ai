'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Settings, LogOut, Users, UserRound, Archive, UserIcon, CreditCard, Mail, Bell, CalendarDays, Building2, CheckSquare } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import type { User, Workspace } from '@/lib/supabase/types'

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
  const router = useRouter()
  const { t } = useI18n()
  const isAdmin = user.role === 'admin' || user.role === 'group_admin'
  const isGroupAdmin = user.role === 'group_admin'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
      <SidebarHeader className="pb-2">
        {isGroupAdmin && groupWorkspaces.length > 0 ? (
          <WorkspaceSwitcher
            workspaces={groupWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            groupName={groupName ?? t('sidebar.group')}
          />
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.48_0.18_20)] text-white text-xs font-extrabold shadow-md shadow-[oklch(0.57_0.20_33/0.35)]">
              CA
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">CasaAI</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">{workspace.name}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {t('nav.work')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/dashboard" icon={LayoutDashboard} label={t('nav.listings')} />
              <NavItem href="/contacts" icon={UserRound} label={t('nav.contacts')} badge={birthdayCount} />
              <NavItem href="/todos" icon={CheckSquare} label={t('nav.todos')} badge={pendingTodos} />
              <NavItem href="/notifications" icon={Bell} label={t('nav.notifications')} badge={unreadNotifications} />
              <NavItem href="/calendar" icon={CalendarDays} label={t('nav.calendar')} exact={false} />
              {hasGroup && <NavItem href="/mls" icon={Building2} label={t('nav.mls')} exact={false} />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {isAdmin ? t('nav.manage') : t('nav.team')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/admin" icon={Users} label={t('nav.team')} />
              <NavItem href="/archive" icon={Archive} label={t('nav.archive')} />
              {isAdmin && <NavItem href="/campaigns" icon={Mail} label={t('nav.campaigns')} />}
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
        <div className="px-2 pb-2">
          <LanguageSwitcher />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-sidebar-accent transition-all duration-200 text-left group/footer">
            <Avatar className="h-8 w-8 ring-2 ring-sidebar-border group-hover/footer:ring-[oklch(0.57_0.20_33/0.4)] transition-all duration-200">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
              <AvatarFallback className="text-xs bg-[oklch(0.57_0.20_33)] text-white font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">{user.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              {t('sidebar.myProfile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('sidebar.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
