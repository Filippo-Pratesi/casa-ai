import Link from 'next/link'
import { redirect } from 'next/navigation'
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
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { InvoiceRemindersToggle } from '@/components/settings/invoice-reminders-toggle'
import { AgentZoneAssignment } from '@/components/settings/agent-zone-assignment'
import { getPlanConfig } from '@/lib/plan-limits'
import { getTranslations } from '@/lib/i18n/server'
import type { Workspace, Group } from '@/lib/supabase/types'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; tab?: string }>
}) {
  const { google, tab = 'generale' } = await searchParams
  const { t } = await getTranslations()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspace_id, group_id, workspaces(*), google_access_token')
    .eq('id', user.id)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: connectionsData } = await (admin as any)
    .from('social_connections')
    .select('id, platform, page_name, page_id')
    .eq('user_id', user.id)

  const connections = (connectionsData ?? []) as {
    id: string; platform: string; page_name: string | null; page_id: string
  }[]

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

  let members: { id: string; name: string; email: string; role: string }[] = []
  if (isAdmin && profile?.workspace_id) {
    const { data: membersData } = await admin
      .from('users')
      .select('id, name, email, role')
      .eq('workspace_id', profile.workspace_id)
      .order('created_at', { ascending: true })
    members = (membersData ?? []) as { id: string; name: string; email: string; role: string }[]
  }

  let agentCount = 0
  let listingsThisMonth = 0
  if (isAdmin && profile?.workspace_id) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [agentsRes, listingsRes] = await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id),
      admin.from('listings').select('id', { count: 'exact', head: true }).eq('workspace_id', profile.workspace_id).gte('created_at', startOfMonth.toISOString()),
    ])
    agentCount = agentsRes.count ?? 0
    listingsThisMonth = listingsRes.count ?? 0
  }

  const planConfig = profile?.workspaces ? getPlanConfig(profile.workspaces.plan) : null

  // Agent zone assignments (for admin Team tab)
  interface AgentZoneRow {
    id: string
    agent_id: string
    zone_id: string
    sub_zone_id: string | null
    agent_name: string
    zone_name: string
    sub_zone_name: string | null
    city: string
  }
  let agentZoneAssignments: AgentZoneRow[] = []
  let allZones: { id: string; name: string; city: string }[] = []
  let allSubZones: { id: string; name: string; zone_id: string }[] = []
  let hasGroupAdmin = false

  if (isAdmin && profile?.workspace_id) {
    const [azRes, zonesRes, subZonesRes, groupAdminRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from('agent_zones')
        .select('id, agent_id, zone_id, sub_zone_id, agent:users!agent_zones_agent_id_fkey(name, email), zone:zones!agent_zones_zone_id_fkey(name, city), sub_zone:sub_zones!agent_zones_sub_zone_id_fkey(name)')
        .eq('workspace_id', profile.workspace_id),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from('zones')
        .select('id, name, city')
        .eq('workspace_id', profile.workspace_id)
        .order('city')
        .order('name'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from('sub_zones')
        .select('id, name, zone_id')
        .eq('workspace_id', profile.workspace_id)
        .order('name'),
      admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', profile.workspace_id)
        .eq('role', 'group_admin'),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agentZoneAssignments = ((azRes.data ?? []) as any[]).map((row) => ({
      id: row.id,
      agent_id: row.agent_id,
      zone_id: row.zone_id,
      sub_zone_id: row.sub_zone_id ?? null,
      agent_name: row.agent?.name?.trim() || row.agent?.email?.split('@')[0] || 'Agente',
      zone_name: row.zone?.name ?? '',
      sub_zone_name: row.sub_zone?.name ?? null,
      city: row.zone?.city ?? '',
    }))
    allZones = (zonesRes.data ?? []) as { id: string; name: string; city: string }[]
    allSubZones = (subZonesRes.data ?? []) as { id: string; name: string; zone_id: string }[]
    hasGroupAdmin = (groupAdminRes.count ?? 0) > 0
  }

  // Piano section visible to group_admin, or to admin if no group_admin exists in workspace
  const showPianoSection = isGroupAdmin || (isAdmin && !hasGroupAdmin)

  const TABS = [
    { id: 'generale', label: 'Generale' },
    { id: 'team', label: 'Team' },
    { id: 'integrazioni', label: 'Integrazioni' },
    { id: 'fatturazione', label: 'Fatturazione' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-in-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {TABS.map(t2 => (
          <Link
            key={t2.id}
            href={`/settings?tab=${t2.id}`}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium text-center transition-all duration-150 ${
              tab === t2.id
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t2.label}
          </Link>
        ))}
      </div>

      {/* Tab: Generale */}
      {tab === 'generale' && (
        <div className="space-y-6">
          {isAdmin && profile?.workspaces && (
            <Card className="animate-in-2">
              <CardHeader>
                <CardTitle>{t('settings.agency')}</CardTitle>
                <CardDescription>{t('settings.agencyDesc')}</CardDescription>
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
                    <CardTitle>{t('settings.group')}</CardTitle>
                    <CardDescription>{t('settings.groupDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <GroupForm group={group} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Preferenze notifiche</CardTitle>
              <CardDescription>Scegli quali notifiche vuoi ricevere nell&apos;app.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferences />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Team */}
      {tab === 'team' && isAdmin && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.team')}</CardTitle>
              <CardDescription>
                {isGroupAdmin ? t('settings.teamDescAdmin') : t('settings.teamDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamManagement
                members={members}
                currentUserId={user.id}
                currentRole={profile?.role ?? ''}
              />
            </CardContent>
          </Card>

          {/* Agent zone assignments */}
          {allZones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Assegnazione agenti per zona</CardTitle>
                <CardDescription>
                  Definisci quale agente riceve automaticamente i nuovi immobili per ogni zona.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentZoneAssignment
                  assignments={agentZoneAssignments}
                  agents={members}
                  zones={allZones}
                  subZones={allSubZones}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Integrazioni */}
      {tab === 'integrazioni' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.social')}</CardTitle>
              <CardDescription>{t('settings.socialDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SocialConnections connections={connections} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.googleCalendar')}</CardTitle>
              <CardDescription>{t('settings.googleCalendarDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <GoogleCalendarConnect
                isConnected={!!profile?.google_access_token}
                flashMessage={google}
              />
            </CardContent>
          </Card>
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.importContacts')}</CardTitle>
                <CardDescription>{t('settings.importContactsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ImportContacts />
              </CardContent>
            </Card>
          )}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.export')}</CardTitle>
                <CardDescription>{t('settings.exportDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <BulkExportButton />
                <p className="text-xs text-muted-foreground">{t('settings.exportNote')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Fatturazione */}
      {tab === 'fatturazione' && isAdmin && (
        <div className="space-y-6">
          {planConfig && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.usage')}</CardTitle>
                <CardDescription>
                  {t('settings.usageDesc')}<strong>{planConfig.name}</strong>
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
          <Card>
            <CardHeader>
              <CardTitle>Solleciti di pagamento</CardTitle>
              <CardDescription>Invia automaticamente promemoria e solleciti ai clienti con fatture in scadenza o scadute.</CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceRemindersToggle
                enabled={(profile?.workspaces as unknown as { reminder_automatici?: boolean })?.reminder_automatici ?? true}
              />
            </CardContent>
          </Card>
          {showPianoSection && (
            <Card>
              <CardHeader>
                <CardTitle>Piano</CardTitle>
                <CardDescription>Gestisci il tuo piano e la fatturazione.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-2 rounded-xl bg-[oklch(0.57_0.20_33)] text-white px-4 py-2 text-sm font-semibold hover:bg-[oklch(0.52_0.20_33)] transition-colors"
                >
                  Gestisci piano →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
