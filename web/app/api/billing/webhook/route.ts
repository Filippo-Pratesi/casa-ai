import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const STRIPE_SECRET    = process.env.STRIPE_SECRET_KEY      ?? ''
const WEBHOOK_SECRET   = process.env.STRIPE_WEBHOOK_SECRET  ?? ''

// Map Stripe product/price metadata plan → DB plan tier
const PLAN_MAP: Record<string, string> = {
  starter: 'starter',
  agenzia: 'agenzia',
  network: 'network',
}

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 })
  }

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const stripe = new Stripe(STRIPE_SECRET)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Firma webhook non valida' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const workspaceId = session.metadata?.workspace_id
    const plan = session.metadata?.plan

    if (workspaceId && plan && PLAN_MAP[plan]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('workspaces')
        .update({ plan: PLAN_MAP[plan] as 'starter' | 'agenzia' | 'network' })
        .eq('id', workspaceId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const workspaceId = sub.metadata?.workspace_id
    if (workspaceId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('workspaces')
        .update({ plan: 'trial' })
        .eq('id', workspaceId)
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription
    const workspaceId = sub.metadata?.workspace_id
    const plan = sub.metadata?.plan
    if (workspaceId && plan && PLAN_MAP[plan]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any)
        .from('workspaces')
        .update({ plan: PLAN_MAP[plan] as 'starter' | 'agenzia' | 'network' })
        .eq('id', workspaceId)
    }
  }

  return NextResponse.json({ received: true })
}
