import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

// POST /api/invoices/[id]/mark-paid
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  let data_pagamento = new Date().toISOString().split('T')[0]
  try {
    const body = await req.json()
    if (body.data_pagamento) data_pagamento = body.data_pagamento
  } catch { /* use today */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('invoices')
    .update({ status: 'pagata', data_pagamento })
    .eq('id', id)
    .eq('workspace_id', profile.workspace_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data_pagamento })
}
