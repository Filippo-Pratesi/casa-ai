import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? ''

// Stripe price IDs per plan+billing — set these in .env after creating products in Stripe
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? '',
    annual:  process.env.STRIPE_PRICE_STARTER_ANNUAL  ?? '',
  },
  growth: {
    monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? process.env.STRIPE_PRICE_AGENZIA_MONTHLY ?? '',
    annual:  process.env.STRIPE_PRICE_GROWTH_ANNUAL  ?? process.env.STRIPE_PRICE_AGENZIA_ANNUAL  ?? '',
  },
  network: {
    monthly: process.env.STRIPE_PRICE_NETWORK_MONTHLY ?? '',
    annual:  process.env.STRIPE_PRICE_NETWORK_ANNUAL  ?? '',
  },
}

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (admin as any)
    .from('users')
    .select('role, workspace_id, workspaces(stripe_customer_id, name)')
    .eq('id', user.id)
    .single()

  if (!profileData) return NextResponse.json({ error: 'Profilo non trovato' }, { status: 404 })

  const profile = profileData as {
    role: string
    workspace_id: string
    workspaces: { stripe_customer_id: string | null; name: string }
  }

  if (profile.role !== 'admin' && profile.role !== 'group_admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const { plan, billing } = body as { plan: string; billing: 'monthly' | 'annual' }

  const priceId = PRICE_IDS[plan]?.[billing]
  if (!priceId) {
    return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_SECRET)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Get or create Stripe customer
  let customerId = profile.workspaces.stripe_customer_id
  if (!customerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userRow } = await (admin as any)
      .from('users')
      .select('email, name')
      .eq('id', user.id)
      .single()

    const customer = await stripe.customers.create({
      email: (userRow as { email: string } | null)?.email ?? user.email ?? '',
      name: profile.workspaces.name,
      metadata: { workspace_id: profile.workspace_id },
    })
    customerId = customer.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any)
      .from('workspaces')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile.workspace_id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?upgraded=1`,
    cancel_url: `${appUrl}/plans`,
    metadata: { workspace_id: profile.workspace_id, plan, billing },
    subscription_data: {
      metadata: { workspace_id: profile.workspace_id, plan },
    },
  })

  return NextResponse.json({ url: session.url })
}
