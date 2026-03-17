import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Bell, Cake } from 'lucide-react'
import { MarkNotificationsReadButton } from '@/components/notifications/mark-read-button'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  contact_id: string | null
  read: boolean
  created_at: string
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('notifications')
    .select('id, type, title, body, contact_id, read, created_at')
    .eq('agent_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as Notification[]
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifiche</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {unread > 0 ? `${unread} non lette` : 'Tutte lette'}
          </p>
        </div>
        {unread > 0 && <MarkNotificationsReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <Bell className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">Nessuna notifica</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">
            Le notifiche appariranno qui — ad esempio i messaggi di compleanno generati per i tuoi clienti.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 space-y-2 transition-colors ${
                n.read ? 'border-neutral-100 bg-white' : 'border-pink-100 bg-pink-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${n.read ? 'bg-neutral-100' : 'bg-pink-100'}`}>
                  <Cake className={`h-3.5 w-3.5 ${n.read ? 'text-neutral-400' : 'text-pink-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{n.title}</p>
                    <p className="text-[11px] text-neutral-400 shrink-0">
                      {new Date(n.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  {n.contact_id && (
                    <Link
                      href={`/contacts/${n.contact_id}`}
                      className="inline-block mt-2 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Vai al contatto →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
