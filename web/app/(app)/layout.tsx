import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveWorkspaceId, applyActiveWorkspace } from '@/lib/supabase/active-workspace'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import type { User, Workspace, Group } from '@/lib/supabase/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use admin client to bypass RLS for profile lookup — avoids auth/setup redirect loop
  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('*, workspaces(*)')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/auth/setup')

  const profile = profileData as User & { workspaces: Workspace }
  const isGroupAdmin = profile.role === 'group_admin'

  // For group_admin: apply active workspace and fetch all group workspaces
  let groupWorkspaces: Workspace[] = []
  let group: Group | null = null
  let activeWorkspaceId = profile.workspace_id

  if (isGroupAdmin && profile.group_id) {
    const cookieActiveId = await getActiveWorkspaceId()
    if (cookieActiveId) {
      activeWorkspaceId = cookieActiveId
      await applyActiveWorkspace(supabase, cookieActiveId)
    }

    const [wsRes, groupRes] = await Promise.all([
      supabase
        .from('workspaces')
        .select('*')
        .eq('group_id', profile.group_id)
        .order('name'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('groups')
        .select('*')
        .eq('id', profile.group_id)
        .single(),
    ])

    groupWorkspaces = (wsRes.data ?? []) as Workspace[]
    group = groupRes.data as Group | null
  }

  // Determine the active workspace object to show in sidebar
  const activeWorkspace = isGroupAdmin
    ? (groupWorkspaces.find((w) => w.id === activeWorkspaceId) ?? profile.workspaces)
    : profile.workspaces

  // Unread notifications count for sidebar badge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: unreadNotificationsCount } = await (admin as any)
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', user.id)
    .eq('read', false)
  const unreadNotifications = (unreadNotificationsCount as number | null) ?? 0

  // Birthday contacts count for sidebar badge (contacts with birthday in next 7 days)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: birthdayContactsData } = await (admin as any)
    .from('contacts')
    .select('date_of_birth')
    .eq('workspace_id', activeWorkspaceId)
    .not('date_of_birth', 'is', null)

  const birthdayCount = ((birthdayContactsData ?? []) as { date_of_birth: string }[]).filter((c) => {
    const [, mm, dd] = c.date_of_birth.split('-').map(Number)
    const today = new Date()
    let next = new Date(today.getFullYear(), mm - 1, dd)
    if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd)
    const diff = Math.ceil((next.getTime() - today.setHours(0, 0, 0, 0)) / 86400000)
    return diff <= 7
  }).length

  // Trial days remaining
  const trialCreatedAt = new Date(activeWorkspace.created_at)
  const trialEnd = new Date(trialCreatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
  const trialDaysLeft = activeWorkspace.plan === 'trial'
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <SidebarProvider>
      <AppSidebar
        user={profile}
        workspace={activeWorkspace}
        groupWorkspaces={groupWorkspaces}
        activeWorkspaceId={activeWorkspaceId}
        groupName={group?.name ?? null}
        trialDaysLeft={trialDaysLeft}
        unreadNotifications={unreadNotifications}
        birthdayCount={birthdayCount}
        hasGroup={!!profile.group_id}
      />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
