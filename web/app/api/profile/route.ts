import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const { name, phone, address, partita_iva, bio } = body as {
    name?: string
    phone?: string
    address?: string
    partita_iva?: string
    bio?: string
  }

  const update: Record<string, string | null> = {}
  if (name !== undefined) update.name = name.trim() || null
  if (phone !== undefined) update.phone = phone.trim() || null
  if (address !== undefined) update.address = address.trim() || null
  if (partita_iva !== undefined) update.partita_iva = partita_iva.trim() || null
  if (bio !== undefined) update.bio = bio.trim() || null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update(update)
    .eq('id', user.id)
    .select('id, name, email, role, phone, address, partita_iva, avatar_url, bio')
    .single()

  if (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Errore aggiornamento profilo' }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}
