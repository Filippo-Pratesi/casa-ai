'use client'

import { useRouter } from 'next/navigation'
import { UserIcon, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'

interface SidebarUserMenuProps {
  name: string
  email: string
  avatar_url: string | null
  initials: string
}

export function SidebarUserMenu({ name, email, avatar_url, initials }: SidebarUserMenuProps) {
  const router = useRouter()
  const { t } = useI18n()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 hover:bg-sidebar-accent transition-all duration-200 text-left group/footer">
        <Avatar className="h-8 w-8 ring-2 ring-sidebar-border group-hover/footer:ring-[oklch(0.57_0.20_33/0.4)] transition-all duration-200">
          {avatar_url && <AvatarImage src={avatar_url} alt={name} />}
          <AvatarFallback className="text-xs bg-[oklch(0.57_0.20_33)] text-white font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">{name}</p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight">{email}</p>
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
  )
}
