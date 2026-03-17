import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY ?? ''

export async function POST(_req: NextRequest) {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('role, workspaces(stripe_customer_id)')
    .eq('id', user.id)
    .single()

  const profile = profileData as {
    role: string
    workspaces: { stripe_customer_id: string | null }
  } | null

  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const customerId = profile.workspaces.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ error: 'Nessun abbonamento attivo' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_SECRET)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
