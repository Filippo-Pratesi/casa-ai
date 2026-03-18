import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Bell, Cake, CheckSquare, CalendarDays, ChevronRight } from 'lucide-react'
import { MarkNotificationsReadButton } from '@/components/notifications/mark-read-button'
import { NotificationLink } from '@/components/notifications/notification-link'
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

function groupByDate(notifications: Notification[]) {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
  const groups: { label: string; items: Notification[] }[] = []
  const todayItems = notifications.filter(n => new Date(n.created_at) >= today)
  const yesterdayItems = notifications.filter(n => { const d = new Date(n.created_at); return d >= yesterday && d < today })
  const weekItems = notifications.filter(n => { const d = new Date(n.created_at); return d >= weekAgo && d < yesterday })
  const olderItems = notifications.filter(n => new Date(n.created_at) < weekAgo)
  if (todayItems.length) groups.push({ label: 'Oggi', items: todayItems })
  if (yesterdayItems.length) groups.push({ label: 'Ieri', items: yesterdayItems })
  if (weekItems.length) groups.push({ label: 'Questa settimana', items: weekItems })
  if (olderItems.length) groups.push({ label: 'Precedenti', items: olderItems })
  return groups
}

function getNotificationRoute(n: Notification): string {
  switch (n.type) {
    case 'birthday':
      return n.contact_id ? `/contacts/${n.contact_id}` : '/contacts'
    case 'todo_assigned':
    case 'todo':
      return '/todos'
    case 'appointment_assigned':
    case 'appointment':
      return '/calendar'
    default:
      return n.contact_id ? `/contacts/${n.contact_id}` : '/notifications'
  }
}

function NotificationIcon({ type, read }: { type: string; read: boolean }) {
  const base = 'h-3.5 w-3.5'
  if (type === 'birthday' || type === 'birthday_reminder') {
    return (
      <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${read ? 'bg-muted' : 'bg-pink-100'}`}>
        <Cake className={`${base} ${read ? 'text-muted-foreground' : 'text-pink-500'}`} />
      </div>
    )
  }
  if (type === 'todo_assigned' || type === 'todo') {
    return (
      <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${read ? 'bg-muted' : 'bg-blue-100'}`}>
        <CheckSquare className={`${base} ${read ? 'text-muted-foreground' : 'text-blue-500'}`} />
      </div>
    )
  }
  if (type === 'appointment_assigned' || type === 'appointment') {
    return (
      <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${read ? 'bg-muted' : 'bg-purple-100'}`}>
        <CalendarDays className={`${base} ${read ? 'text-muted-foreground' : 'text-purple-500'}`} />
      </div>
    )
  }
  return (
    <div className={`mt-0.5 rounded-full p-1.5 shrink-0 ${read ? 'bg-muted' : 'bg-muted'}`}>
      <Bell className={`${base} text-muted-foreground`} />
    </div>
  )
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
  const dateLocale = locale === 'en' ? 'en-GB' : 'it-IT'

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between animate-in-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('notifications.title')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {unread > 0 ? `${unread} ${t('notifications.unread')}` : t('notifications.allRead')}
          </p>
        </div>
        {unread > 0 && (
          <div className="flex items-center gap-3">
            <MarkNotificationsReadButton />
          </div>
        )}
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
        <div className="animate-in-2 space-y-4">
          {groupByDate(notifications).map((group) => (
            <div key={group.label}>
              <h3 className="sticky top-0 bg-background/80 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 py-2 z-10">{group.label}</h3>
              <div className="space-y-2">
                {group.items.map((n) => {
                  const href = getNotificationRoute(n)
                  // Relative timestamp
                  const now = Date.now()
                  const created = new Date(n.created_at).getTime()
                  const diffMin = Math.floor((now - created) / 60000)
                  const diffH = Math.floor(diffMin / 60)
                  const diffD = Math.floor(diffH / 24)
                  const relTime = diffMin < 1 ? 'ora' : diffMin < 60 ? `${diffMin} min fa` : diffH < 24 ? `${diffH}h fa` : diffD < 7 ? `${diffD}g fa` : new Date(n.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })

                  return (
                    <NotificationLink
                      key={n.id}
                      href={href}
                      notificationId={n.id}
                      read={n.read}
                      className={`group card-lift block rounded-xl border p-4 transition-colors ${
                        n.read
                          ? 'border-border bg-card opacity-70'
                          : 'border-[oklch(0.57_0.20_33/0.3)] bg-[oklch(0.57_0.20_33/0.05)] border-l-4 border-l-[oklch(0.57_0.20_33)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <NotificationIcon type={n.type} read={n.read} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate group-hover:text-[oklch(0.57_0.20_33)] transition-colors">
                              {n.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground shrink-0">{relTime}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{n.body}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </NotificationLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
