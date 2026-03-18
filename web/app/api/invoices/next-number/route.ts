import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/invoices/next-number?anno=2026
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin.from('users').select('workspace_id').eq('id', user.id).single()
  const profile = profileData as { workspace_id: string } | null
  if (!profile) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const anno = parseInt(req.nextUrl.searchParams.get('anno') ?? String(new Date().getFullYear()))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any).rpc('next_invoice_number', {
    p_workspace_id: profile.workspace_id,
    p_anno: anno,
  })

  const progressivo = (data as number) ?? 1
  const numero_fattura = `${anno}/${String(progressivo).padStart(3, '0')}`

  return NextResponse.json({ anno, progressivo, numero_fattura })
}
