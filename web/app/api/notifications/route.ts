import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  contact_id: string | null
  read: boolean
  created_at: string
}

// GET /api/notifications — list unread notifications for current user
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('notifications')
    .select('id, type, title, body, contact_id, read, created_at')
    .eq('agent_id', user.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notifications: (data ?? []) as Notification[] })
}

// PATCH /api/notifications — mark all as read, or single if body { id }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  let notificationId: string | undefined
  try {
    const body = await req.json()
    if (typeof body.id === 'string') notificationId = body.id
  } catch { /* no body — mark all */ }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('notifications')
    .update({ read: true })
    .eq('agent_id', user.id)

  if (notificationId) {
    query = query.eq('id', notificationId)
  } else {
    query = query.eq('read', false)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
