import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/cron/omi-check — Monthly check if OMI data is stale
// Trigger: Vercel Cron — 1st of each month at 08:00
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  // Check last upload date
  const { data: config } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'last_omi_upload_date')
    .single()

  if (!config?.value) {
    await notifyAdmins(admin, 'Nessun dataset OMI caricato. Carica il CSV nelle Impostazioni per abilitare la stima automatica del valore degli immobili.')
    return NextResponse.json({ status: 'notified', reason: 'no_csv' })
  }

  const rawValue = config.value as unknown
  const uploadDate = new Date(typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue as string)
  const monthsAgo = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24 * 30)

  if (monthsAgo > 8) {
    await notifyAdmins(admin, `Il dataset OMI e stato caricato ${Math.floor(monthsAgo)} mesi fa. Verifica se e disponibile un nuovo semestre su telematici.agenziaentrate.gov.it e aggiorna il CSV nelle Impostazioni.`)
    return NextResponse.json({ status: 'notified', reason: 'stale', months_ago: Math.floor(monthsAgo) })
  }

  return NextResponse.json({ status: 'ok', reason: 'fresh', months_ago: Math.floor(monthsAgo) })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyAdmins(admin: any, message: string) {
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id')

  for (const ws of (workspaces ?? []) as { id: string }[]) {
    const { data: admins } = await admin
      .from('users')
      .select('id')
      .eq('workspace_id', ws.id)
      .in('role', ['admin', 'group_admin'])

    for (const u of (admins ?? []) as { id: string }[]) {
      await admin.from('notifications').insert({
        user_id: u.id,
        workspace_id: ws.id,
        title: 'Aggiornamento OMI',
        message,
        type: 'system',
      })
    }
  }
}
