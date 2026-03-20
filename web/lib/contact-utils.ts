/**
 * Shared contact type color mappings used across the contacts module.
 * Canonical definitions live in lib/constants/contact-types.ts.
 * Re-exported here for backwards compatibility.
 */
export { CONTACT_TYPE_COLORS, CONTACT_TYPE_LABELS } from '@/lib/constants/contact-types'

/**
 * Returns the number of days until the contact's next birthday,
 * or null if the birthday is more than 7 days away or dob is null.
 */
export function birthdayDaysLeft(dob: string | null): number | null {
  if (!dob) return null
  const now = new Date()
  const todayMidnightMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const [, mm, dd] = dob.split('-').map(Number)
  let next = new Date(now.getFullYear(), mm - 1, dd)
  if (next.getTime() < todayMidnightMs) next = new Date(now.getFullYear() + 1, mm - 1, dd)
  const diff = Math.ceil((next.getTime() - todayMidnightMs) / 86400000)
  return diff <= 7 ? diff : null
}

