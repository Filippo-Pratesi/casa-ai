// Match Engine v2 — deterministic scoring logic
// Shared between server-side compute and TypeScript tooling

export const SCORE_WEIGHTS = {
  budget: 30,
  location: 25,
  propertyType: 15,
  sqm: 12,
  rooms: 10,
  featureOverlap: 8,
} as const

export interface PropertyForMatch {
  id: string
  workspace_id: string
  city: string
  property_type: string | null
  transaction_type: string | null // 'vendita' | 'affitto'
  estimated_value: number | null
  sqm: number | null
  rooms: number | null
  features: string[] | null
}

export interface ContactForMatch {
  id: string
  name: string
  type: string // 'buyer' | 'renter'
  budget_min: number | null
  budget_max: number | null
  preferred_cities: string[] | null
  preferred_types: string[] | null
  min_sqm: number | null
  min_rooms: number | null
  desired_features: string[] | null
}

export function computeDeterministicScore(
  property: PropertyForMatch,
  contact: ContactForMatch,
): number {
  // Transaction type alignment check
  if (property.transaction_type === 'vendita' && contact.type !== 'buyer') return 0
  if (property.transaction_type === 'affitto' && contact.type !== 'renter') return 0

  let score = 0
  const price = property.estimated_value

  // Budget (weight 30)
  if (contact.budget_max === null && contact.budget_min === null) {
    score += 15
  } else if (price !== null && contact.budget_max !== null) {
    const min = contact.budget_min ?? 0
    if (price >= min && price <= contact.budget_max) {
      score += 30
    } else if (price <= contact.budget_max * 1.15) {
      score += 15
    } else if (contact.budget_max > 0 && price <= contact.budget_max * 1.30) {
      score += 5
    }
  } else {
    score += 15
  }

  // Location (weight 25)
  const prefCities = contact.preferred_cities ?? []
  if (prefCities.length === 0) {
    score += 12
  } else if (prefCities.map(c => c.toLowerCase()).includes((property.city?.toLowerCase() ?? ''))) {
    score += 25
  }

  // Property type (weight 15)
  const prefTypes = contact.preferred_types ?? []
  if (prefTypes.length === 0) {
    score += 7
  } else if (property.property_type && prefTypes.includes(property.property_type)) {
    score += 15
  } else if (property.property_type) {
    // Substitute types
    const substitutes: Record<string, string[]> = {
      apartment: ['house'],
      house: ['apartment', 'villa'],
      villa: ['house'],
    }
    const subs = substitutes[property.property_type] ?? []
    if (subs.some(s => prefTypes.includes(s))) score += 4
  }

  // Rooms (weight 10)
  if (contact.min_rooms === null || property.rooms === null) {
    score += 5
  } else if (property.rooms >= contact.min_rooms) {
    score += 10
  } else if (property.rooms === contact.min_rooms - 1) {
    score += 4
  }

  // Sqm (weight 12)
  if (contact.min_sqm === null || property.sqm === null) {
    score += 6
  } else if (property.sqm >= contact.min_sqm) {
    score += 12
  } else if (property.sqm >= contact.min_sqm * 0.9) {
    score += 7
  } else if (property.sqm >= contact.min_sqm * 0.75) {
    score += 2
  }

  // Feature overlap (weight 8)
  const desired = contact.desired_features ?? []
  const propFeatures = property.features ?? []
  if (desired.length === 0) {
    score += 4
  } else if (propFeatures.length === 0) {
    score += 4
  } else {
    const intersection = desired.filter(f => propFeatures.includes(f))
    score += Math.round(8 * intersection.length / desired.length)
  }

  return Math.min(100, Math.max(0, score))
}
