import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/catasto/save — persist territorial risk data on a property (fire-and-forget)
export async function POST(req: NextRequest) {
  // Auth check — user must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { property_id, cadastral_data } = await req.json() as {
    property_id: string
    cadastral_data: unknown
  }

  if (!property_id || !cadastral_data) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
  }

  // Use admin client to bypass workspace lookup — user auth already verified above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error } = await admin
    .from('properties')
    .update({
      cadastral_data,
      cadastral_data_fetched_at: new Date().toISOString(),
    })
    .eq('id', property_id)

  if (error) {
    return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
