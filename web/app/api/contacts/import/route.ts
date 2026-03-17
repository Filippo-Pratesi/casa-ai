import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ImportRow {
  name: string
  email?: string | null
  phone?: string | null
  type?: string
  city_of_residence?: string | null
  notes?: string | null
  budget_min?: number | null
  budget_max?: number | null
  min_rooms?: number | null
  min_sqm?: number | null
  date_of_birth?: string | null
}

const VALID_TYPES = ['buyer', 'seller', 'renter', 'landlord', 'other']

function toNumber(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = Number(val.replace(/[.,\s]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function toNullable(val: string | undefined): string | null {
  return val && val.trim() !== '' ? val.trim() : null
}

// POST /api/contacts/import — import contacts from parsed CSV rows
export async function POST(req: NextRequest) {
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

  let body: { rows: Record<string, string>[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo richiesta non valido' }, { status: 400 })
  }

  const rows = body.rows ?? []
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Nessuna riga da importare' }, { status: 400 })
  }

  // Fetch existing emails to detect duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('contacts')
    .select('email')
    .eq('workspace_id', profile.workspace_id)
    .not('email', 'is', null)

  const existingEmails = new Set(
    ((existing ?? []) as { email: string }[]).map(c => c.email.toLowerCase().trim())
  )

  const toInsert: ImportRow[] = []
  const errors: string[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const name = toNullable(row['Nome'] ?? row['name'] ?? row['NAME'])
    if (!name) {
      errors.push(`Riga ${i + 1}: nome mancante`)
      continue
    }

    const email = toNullable(row['Email'] ?? row['email'] ?? row['EMAIL'])
    if (email && existingEmails.has(email.toLowerCase())) {
      skipped++
      continue
    }

    const typeRaw = (row['Tipo'] ?? row['type'] ?? row['TYPE'] ?? '').toLowerCase().trim()
    const type = VALID_TYPES.includes(typeRaw) ? typeRaw : 'other'

    toInsert.push({
      name,
      email,
      phone: toNullable(row['Telefono'] ?? row['phone'] ?? row['PHONE']),
      type,
      city_of_residence: toNullable(row['Città'] ?? row['city_of_residence'] ?? row['city'] ?? row['CITY']),
      notes: toNullable(row['Note'] ?? row['notes'] ?? row['NOTES']),
      budget_min: toNumber(row['Budget Min'] ?? row['budget_min']),
      budget_max: toNumber(row['Budget Max'] ?? row['budget_max']),
      min_rooms: toNumber(row['Stanze Min'] ?? row['min_rooms']),
      min_sqm: toNumber(row['MQ Min'] ?? row['min_sqm']),
      date_of_birth: toNullable(row['Data Nascita'] ?? row['date_of_birth']),
    })

    if (email) existingEmails.add(email.toLowerCase())
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ imported: 0, skipped, errors })
  }

  const payload = toInsert.map(r => ({
    workspace_id: profile.workspace_id,
    created_by: user.id,
    agent_id: user.id,
    ...r,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin as any)
    .from('contacts')
    .insert(payload)

  if (insertError) {
    return NextResponse.json({ error: 'Errore durante l\'inserimento', details: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ imported: toInsert.length, skipped, errors })
}
