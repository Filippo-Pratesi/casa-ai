import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { WorkspaceForm } from '@/components/settings/workspace-form'
import { SocialConnections } from '@/components/settings/social-connections'
import { GroupForm } from '@/components/settings/group-form'
import { TeamManagement } from '@/components/settings/team-management'
import { UsageMeters } from '@/components/settings/usage-meters'
import { BulkExportButton } from '@/components/settings/bulk-export-button'
import { GoogleCalendarConnect } from '@/components/settings/google-calendar-connect'
import { ImportContacts } from '@/components/settings/import-contacts'
import { getPlanConfig } from '@/lib/plan-limits'
import type { Workspace, Group } from '@/lib/supabase/types'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>
}) {
  const { google } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id, group_id, workspaces(*), google_access_token')
    .eq('id', user!.id)
    .single()

  const profile = profileData as {
    role: string
    workspace_id: string
    group_id: string | null
    workspaces: Workspace
    google_access_token: string | null
  } | null

  const isAdmin = profile?.role === 'admin' || profile?.role === 'group_admin'
  const isGroupAdmin = profile?.role === 'group_admin'

  // Load social connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connectionsData } = await (admin as any)
    .from('social_connections')
    .select('id, platform, page_name, page_id')
    .eq('user_id', user!.id)

  const connections = (connectionsData ?? []) as {
    id: string; platform: string; page_name: string | null; page_id: string
  }[]

  // Load group data for group_admin
  let group: Group | null = null
  if (isGroupAdmin && profile?.group_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: groupData } = await (admin as any)
      .from('groups')
      .select('*')
      .eq('id', profile.group_id)
      .single()
    group = groupData as Group | null
  }

  // Load workspace members (admin and group_admin only)
  let members: { id: string; name: string; email: string; role: string }[] = []
  if (isAdmin && profile?.workspace_id) {
    const { data: membersData } = await admin
      .from('users')
      .select('id, name, email, role')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: true })
    members = (membersData ?? []) as { id: string; name: string; email: string; role: string }[]
  }

  // Fetch usage stats for admin
  let agentCount = 0
  let listingsThisMonth = 0
  if (isAdmin && profile?.workspace_id) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [agentsRes, listingsRes] = await Promise.all([
      admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', profile.workspace_id),
      admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', profile.workspace_id)
        .gte('created_at', startOfMonth.toISOString()),
    ])
    agentCount = agentsRes.count ?? 0
    listingsThisMonth = listingsRes.count ?? 0
  }

  const planConfig = profile?.workspaces
    ? getPlanConfig(profile.workspaces.plan)
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-neutral-500 text-sm mt-1">Gestisci workspace, team e account social</p>
      </div>

      {isAdmin && profile?.workspaces && (
        <Card>
          <CardHeader>
            <CardTitle>Agenzia</CardTitle>
            <CardDescription>Nome e impostazioni predefinite per questo ufficio</CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceForm workspace={profile.workspaces} />
          </CardContent>
        </Card>
      )}

      {isGroupAdmin && group && (
        <Card className="border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">G</div>
              <div>
                <CardTitle>Gruppo</CardTitle>
                <CardDescription>Impostazioni globali per tutte le agenzie del gruppo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GroupForm group={group} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>
              {isGroupAdmin
                ? 'Gestisci agenti e admin del workspace. Puoi promuovere agenti ad admin o rimuovere membri.'
                : 'Aggiungi o rimuovi agenti dal workspace.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamManagement
              members={members}
              currentUserId={user!.id}
              currentRole={profile!.role}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && planConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Utilizzo piano</CardTitle>
            <CardDescription>
              Piano attuale: <strong>{planConfig.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageMeters
              agentCount={agentCount}
              maxAgents={planConfig.maxAgents}
              listingsThisMonth={listingsThisMonth}
              maxListingsPerMonth={planConfig.maxListingsPerMonth}
              planName={planConfig.name}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Export portali</CardTitle>
            <CardDescription>
              Esporta tutti gli annunci pubblicati in formato XML per Immobiliare.it, Casa.it, Idealista
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BulkExportButton />
            <p className="text-xs text-neutral-400">
              Il file XML generato è compatibile con il formato standard di importazione dei principali portali immobiliari italiani.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account social</CardTitle>
          <CardDescription>
            Connetti i tuoi account per pubblicare annunci direttamente dall&apos;app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialConnections connections={connections} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar</CardTitle>
          <CardDescription>
            Sincronizza gli appuntamenti di CasaAI con il tuo Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleCalendarConnect
            isConnected={!!profile?.google_access_token}
            flashMessage={google}
          />
        </CardContent>
      </Card>

      {(profile?.role === 'admin' || profile?.role === 'group_admin') && (
        <Card>
          <CardHeader>
            <CardTitle>Importa contatti</CardTitle>
            <CardDescription>
              Carica un file CSV per importare clienti in blocco nel workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportContacts />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
