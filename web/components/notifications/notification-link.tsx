'use client'

import { useRouter } from 'next/navigation'

interface NotificationLinkProps {
  href: string
  notificationId: string
  read: boolean
  className?: string
  children: React.ReactNode
}

export function NotificationLink({ href, notificationId, read, className, children }: NotificationLinkProps) {
  const router = useRouter()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (!read) {
      // Fire-and-forget — don't block navigation
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      }).then(() => {
        // Refresh server components so sidebar badge count updates
        router.refresh()
      }).catch(() => { /* ignore */ })
    }
    router.push(href)
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
