import { createAdminClient } from '@/lib/supabase/admin'

export type PlanTier = 'trial' | 'starter' | 'growth' | 'network'

const PLAN_LIMITS_BYTES: Record<PlanTier, number> = {
  trial:   100  * 1024 * 1024,         // 100 MB
  starter: 1    * 1024 * 1024 * 1024,  // 1 GB
  growth:  5    * 1024 * 1024 * 1024,  // 5 GB
  network: 20   * 1024 * 1024 * 1024,  // 20 GB
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function planLimitBytes(plan: PlanTier): number {
  return PLAN_LIMITS_BYTES[plan] ?? PLAN_LIMITS_BYTES.trial
}

/**
 * Returns the total bytes used across both attachment tables for a workspace.
 */
export async function getWorkspaceStorageUsed(workspaceId: string): Promise<number> {
  const admin = createAdminClient()

  const [contactResult, listingResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('contact_attachments')
      .select('size_bytes.sum()')
      .eq('workspace_id', workspaceId)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('listing_attachments')
      .select('size_bytes.sum()')
      .eq('workspace_id', workspaceId)
      .single(),
  ])

  const contactBytes: number = (contactResult.data?.sum ?? 0) as number
  const listingBytes: number = (listingResult.data?.sum ?? 0) as number

  return contactBytes + listingBytes
}

/**
 * Checks if uploading `newFileBytes` would exceed the workspace plan limit.
 * Returns { allowed: true } or { allowed: false, message, used, limit }.
 */
export async function checkStorageQuota(
  workspaceId: string,
  plan: PlanTier,
  newFileBytes: number
): Promise<
  | { allowed: true }
  | { allowed: false; message: string; used: number; limit: number }
> {
  const limit = planLimitBytes(plan)
  const used = await getWorkspaceStorageUsed(workspaceId)

  if (used + newFileBytes > limit) {
    return {
      allowed: false,
      message: `Spazio di archiviazione esaurito. Utilizzo attuale: ${formatBytes(used)} / ${formatBytes(limit)}. Aggiorna il piano per aumentare lo spazio.`,
      used,
      limit,
    }
  }

  return { allowed: true }
}
