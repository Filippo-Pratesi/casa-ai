import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { connection_id } = await req.json()

  if (!connection_id) {
    return NextResponse.json({ error: 'connection_id mancante' }, { status: 400 })
  }

  // RLS ensures users can only delete their own connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('social_connections')
    .delete()
    .eq('id', connection_id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ error: 'Errore nella disconnessione' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
