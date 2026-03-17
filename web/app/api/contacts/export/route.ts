import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/contacts/export — returns workspace contacts as CSV download
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profileData } = await admin
    .from('users')
    .select('workspace_id, role')
    .eq('id', user.id)
    .single()

  const profile = profileData as { workspace_id: string; role: string } | null
  if (!profile || (profile.role !== 'admin' && profile.role !== 'group_admin')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsData, error } = await (admin as any)
    .from('contacts')
    .select('name, email, phone, type, city_of_residence, notes, budget_min, budget_max, min_rooms, min_sqm, date_of_birth, created_at')
    .eq('workspace_id', profile.workspace_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Errore nel recupero contatti' }, { status: 500 })

  const contacts = (contactsData ?? []) as Array<Record<string, unknown>>

  const headers = ['Nome', 'Email', 'Telefono', 'Tipo', 'Città', 'Note', 'Budget Min', 'Budget Max', 'Stanze Min', 'MQ Min', 'Data Nascita', 'Creato il']
  const fields: string[] = ['name', 'email', 'phone', 'type', 'city_of_residence', 'notes', 'budget_min', 'budget_max', 'min_rooms', 'min_sqm', 'date_of_birth', 'created_at']

  function escCsv(val: unknown): string {
    if (val === null || val === undefined) return ''
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const rows = [
    headers.join(','),
    ...contacts.map(c => fields.map(f => escCsv(c[f])).join(',')),
  ]

  const csv = rows.join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clienti-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
