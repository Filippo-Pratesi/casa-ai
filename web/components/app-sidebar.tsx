'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusSquare, Settings, LogOut, Users, UserRound, Archive, UserIcon, CreditCard, Mail, Bell, CalendarDays, Building2 } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'
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
}

const agentNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Nuovo annuncio', href: '/listing/new', icon: PlusSquare },
  { label: 'Clienti', href: '/contacts', icon: UserRound },
]

const teamNav = [
  { label: 'Team', href: '/admin', icon: Users },
  { label: 'Archivio', href: '/archive', icon: Archive },
  { label: 'Campagne', href: '/campaigns', icon: Mail, adminOnly: true },
]

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
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
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
    <Sidebar className="border-r border-neutral-200/80">
      <SidebarHeader className="pb-2">
        {isGroupAdmin && groupWorkspaces.length > 0 ? (
          <WorkspaceSwitcher
            workspaces={groupWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            groupName={groupName ?? 'Gruppo'}
          />
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 text-white text-xs font-bold shadow-sm">
              CA
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral-900 leading-tight">CasaAI</p>
              <p className="text-[11px] text-neutral-400 truncate leading-tight">{workspace.name}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            Lavoro
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Annunci" />
              <NavItem href="/listing/new" icon={PlusSquare} label="Nuovo annuncio" />
              <NavItem href="/contacts" icon={UserRound} label="Clienti" badge={birthdayCount} />
              <NavItem href="/notifications" icon={Bell} label="Notifiche" badge={unreadNotifications} />
              <NavItem href="/calendar" icon={CalendarDays} label="Calendario" exact={false} />
              {hasGroup && <NavItem href="/mls" icon={Building2} label="MLS" exact={false} />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {isAdmin ? 'Gestione' : 'Team'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <NavItem href="/admin" icon={Users} label="Team" />
              <NavItem href="/archive" icon={Archive} label="Archivio" />
              {isAdmin && <NavItem href="/campaigns" icon={Mail} label="Campagne" />}
              <NavItem href="/settings" icon={Settings} label="Impostazioni" />
              {isAdmin && <NavItem href="/plans" icon={CreditCard} label="Piano" />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {trialDaysLeft !== null && isAdmin && (
        <div className="mx-3 mb-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">Trial — {trialDaysLeft} giorni rimasti</p>
          <Link href="/plans" className="text-xs text-amber-600 hover:text-amber-700 hover:underline transition-colors">
            Scegli un piano →
          </Link>
        </div>
      )}

      <SidebarFooter className="px-2 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-neutral-100 transition-all duration-150 text-left group/footer">
            <Avatar className="h-8 w-8 ring-2 ring-neutral-200 group-hover/footer:ring-neutral-300 transition-all">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
              <AvatarFallback className="text-xs bg-neutral-200 font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-neutral-400 truncate leading-tight">{user.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              Il mio profilo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
