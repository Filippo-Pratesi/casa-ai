'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PlusSquare, Settings, LogOut, Users, UserRound, Archive, UserIcon, CreditCard, Mail, Bell } from 'lucide-react'
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

  return (
    <Sidebar>
      <SidebarHeader>
        {isGroupAdmin && groupWorkspaces.length > 0 ? (
          <WorkspaceSwitcher
            workspaces={groupWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            groupName={groupName ?? 'Gruppo'}
          />
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white text-xs font-bold">
              CA
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 leading-tight">CasaAI</p>
              <p className="text-[11px] text-neutral-400 truncate leading-tight">{workspace.name}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Annunci</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentNav.map((item) => {
                const badge = item.href === '/contacts' && birthdayCount > 0 ? birthdayCount : null
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                    >
                      <item.icon />
                      <span className="flex-1">{item.label}</span>
                      {badge !== null && (
                        <span className="ml-auto rounded-full bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                          {badge}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/notifications" />}
                  isActive={pathname === '/notifications'}
                >
                  <Bell />
                  <span className="flex-1">Notifiche</span>
                  {unreadNotifications > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {unreadNotifications}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? 'Amministrazione' : 'Team'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teamNav.filter(item => !item.adminOnly || isAdmin).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/settings" />}
                  isActive={pathname === '/settings'}
                >
                  <Settings />
                  <span>Impostazioni</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/plans" />}
                    isActive={pathname === '/plans'}
                  >
                    <CreditCard />
                    <span>Piano</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {trialDaysLeft !== null && isAdmin && (
        <div className="mx-2 mb-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-medium text-amber-800">Trial — {trialDaysLeft} giorni rimanenti</p>
          <Link href="/plans" className="text-xs text-amber-600 hover:underline">Scegli un piano →</Link>
        </div>
      )}

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-neutral-100 transition-colors text-left">
            <Avatar className="h-8 w-8">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
              <AvatarFallback className="text-xs bg-neutral-200">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-neutral-500 truncate">{user.email}</p>
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
