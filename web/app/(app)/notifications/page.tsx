import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { Bell, Cake } from 'lucide-react'
import { MarkNotificationsReadButton } from '@/components/notifications/mark-read-button'
import { getTranslations } from '@/lib/i18n/server'

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
  const { t, locale } = await getTranslations()

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
          <h1 className="text-2xl font-extrabold tracking-tight">{t('notifications.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unread > 0 ? `${unread} ${t('notifications.unread')}` : t('notifications.allRead')}
          </p>
        </div>
        {unread > 0 && <MarkNotificationsReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="mesh-bg flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33)] to-[oklch(0.66_0.15_188)] shadow-lg shadow-[oklch(0.57_0.20_33/0.3)]">
            <Bell className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-base font-semibold">{t('notifications.empty.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">{t('notifications.empty.body')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 space-y-2 transition-colors ${
                n.read ? 'border-border bg-card' : 'border-pink-200 bg-pink-50 dark:bg-pink-950/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${n.read ? 'bg-muted' : 'bg-pink-100'}`}>
                  <Cake className={`h-3.5 w-3.5 ${n.read ? 'text-muted-foreground' : 'text-pink-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(n.created_at).toLocaleDateString(locale === 'en' ? 'en-GB' : 'it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  {n.contact_id && (
                    <Link
                      href={`/contacts/${n.contact_id}`}
                      className="inline-block mt-2 text-xs text-muted-foreground hover:text-[oklch(0.57_0.20_33)] transition-colors"
                    >
                      {t('notifications.goToContact')}
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
