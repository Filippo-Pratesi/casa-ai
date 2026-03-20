'use client'

import { useEffect, useState, useCallback } from 'react'
import { WifiOff, CloudUpload, X, Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getQueue, removeFromQueue, type QueuedEvent } from '@/lib/offline-queue'
import { toast } from 'sonner'

type SyncState = 'idle' | 'syncing' | 'done'

export function OfflineSyncIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueLength, setQueueLength] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [dismissed, setDismissed] = useState(false)

  // Re-check queue from localStorage
  const refreshQueue = useCallback(() => {
    setQueueLength(getQueue().length)
  }, [])

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine)
    refreshQueue()

    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true)
      setDismissed(false)
      refreshQueue()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }

    // Storage event for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'casa_ai_offline_queue') {
        refreshQueue()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('storage', handleStorage)

    // Poll queue periodically (for same-tab updates)
    const interval = setInterval(refreshQueue, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [refreshQueue])

  const handleSync = useCallback(async () => {
    const queue = getQueue()
    if (queue.length === 0) return

    setSyncState('syncing')

    try {
      const events = queue.map((e: QueuedEvent) => ({
        property_id: e.property_id,
        type: e.type,
        content: e.content,
        created_at: e.created_at,
      }))

      const res = await fetch('/api/property-events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      })

      if (!res.ok) {
        throw new Error('Errore durante la sincronizzazione')
      }

      const data = await res.json()
      const synced: number = data.synced ?? 0

      // Remove synced events from queue
      // We sync all in one batch — if successful, remove all from queue
      for (const e of queue) {
        removeFromQueue(e.id)
      }

      setSyncState('done')
      refreshQueue()
      toast.success(`${synced} ${synced === 1 ? 'nota sincronizzata' : 'note sincronizzate'} con successo`)

      // Reset done state after 3s
      setTimeout(() => {
        setSyncState('idle')
        setDismissed(true)
      }, 3000)
    } catch (err) {
      setSyncState('idle')
      toast.error(err instanceof Error ? err.message : 'Errore di sincronizzazione')
    }
  }, [refreshQueue])

  // Nothing to show
  if (dismissed && isOnline && queueLength === 0) return null
  if (isOnline && queueLength === 0 && syncState === 'idle') return null

  return (
    <div className="px-6 lg:px-8 pt-2">
      {/* Offline banner */}
      {!isOnline && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5',
          'dark:border-orange-800/50 dark:bg-orange-950/40'
        )}>
          <WifiOff className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
            Modalità offline — le note verranno salvate localmente
          </p>
        </div>
      )}

      {/* Pending sync banner (online, has queued items) */}
      {isOnline && queueLength > 0 && syncState !== 'done' && (
        <div className={cn(
          'flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5',
          'dark:border-blue-800/50 dark:bg-blue-950/40'
        )}>
          <CloudUpload className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="flex-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            {queueLength} {queueLength === 1 ? 'evento in attesa' : 'eventi in attesa'} di sincronizzazione
          </p>
          <button
            onClick={handleSync}
            disabled={syncState === 'syncing'}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all',
              'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60',
              'dark:bg-blue-500 dark:hover:bg-blue-600'
            )}
          >
            {syncState === 'syncing' ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Sincronizzo...
              </>
            ) : (
              <>
                <CloudUpload className="h-3 w-3" />
                Sincronizza ora
              </>
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Nascondi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Success state */}
      {syncState === 'done' && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5',
          'dark:border-green-800/50 dark:bg-green-950/40'
        )}>
          <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-xs font-medium text-green-700 dark:text-green-300">
            Sincronizzazione completata
          </p>
        </div>
      )}
    </div>
  )
}
