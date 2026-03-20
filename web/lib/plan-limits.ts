export type PlanTier = 'trial' | 'starter' | 'growth' | 'network'

export interface PlanConfig {
  name: string
  maxAgents: number          // -1 = unlimited
  maxListingsPerMonth: number // -1 = unlimited
  maxContacts: number         // -1 = unlimited
  storageBytes: number
  aiGeneration: boolean
  socialPublishing: boolean
  pdfBrochure: boolean
  portalExport: boolean
  emailCampaigns: boolean
  multiWorkspace: boolean
  prioritySupport: boolean
  trialDays: number
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  trial: {
    name: 'Trial',
    maxAgents: 3,
    maxListingsPerMonth: 10,
    maxContacts: 50,
    storageBytes: 100 * 1024 * 1024, // 100MB
    aiGeneration: true,
    socialPublishing: true,
    pdfBrochure: true,
    portalExport: true,
    emailCampaigns: false,
    multiWorkspace: false,
    prioritySupport: false,
    trialDays: 30,
  },
  starter: {
    name: 'Starter',
    maxAgents: 3,
    maxListingsPerMonth: -1,
    maxContacts: -1,
    storageBytes: 1 * 1024 * 1024 * 1024, // 1GB
    aiGeneration: true,
    socialPublishing: true,
    pdfBrochure: true,
    portalExport: true,
    emailCampaigns: false,
    multiWorkspace: false,
    prioritySupport: false,
    trialDays: 0,
  },
  growth: {
    name: 'Agenzia',
    maxAgents: 15,
    maxListingsPerMonth: -1,
    maxContacts: -1,
    storageBytes: 5 * 1024 * 1024 * 1024, // 5GB
    aiGeneration: true,
    socialPublishing: true,
    pdfBrochure: true,
    portalExport: true,
    emailCampaigns: true,
    multiWorkspace: false,
    prioritySupport: false,
    trialDays: 0,
  },
  network: {
    name: 'Network',
    maxAgents: -1,
    maxListingsPerMonth: -1,
    maxContacts: -1,
    storageBytes: 20 * 1024 * 1024 * 1024, // 20GB
    aiGeneration: true,
    socialPublishing: true,
    pdfBrochure: true,
    portalExport: true,
    emailCampaigns: true,
    multiWorkspace: true,
    prioritySupport: true,
    trialDays: 0,
  },
}

export function getPlanConfig(plan: string): PlanConfig {
  return PLAN_CONFIG[plan as PlanTier] ?? PLAN_CONFIG.trial
}

export function canUseFeature(plan: string, feature: keyof PlanConfig): boolean {
  const config = getPlanConfig(plan)
  return config[feature] === true
}

// Annual price = monthly × 12 × 0.95 (5% discount) / 12, rounded
export const PLAN_PRICES: Record<Exclude<PlanTier, 'trial'>, { monthly: number; annual: number }> = {
  starter: { monthly: 149, annual: 142 },
  growth: { monthly: 299, annual: 284 },
  network:  { monthly: 899, annual: 854 },
}
