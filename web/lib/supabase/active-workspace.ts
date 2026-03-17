import { cookies } from 'next/headers'

export const ACTIVE_WORKSPACE_COOKIE = 'active_workspace_id'

export async function getActiveWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null
}

// Call this after createClient() for group_admin users to activate workspace switching
export async function applyActiveWorkspace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  activeWorkspaceId: string | null
) {
  if (activeWorkspaceId) {
    await supabase.rpc('set_active_workspace', { p_workspace_id: activeWorkspaceId })
  }
}
