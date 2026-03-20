export interface QueuedEvent {
  id: string          // temp UUID
  property_id: string
  workspace_id: string
  type: string
  content: string
  created_at: string  // ISO
}

const STORAGE_KEY = 'casa_ai_offline_queue'

export function getQueue(): QueuedEvent[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function enqueue(event: Omit<QueuedEvent, 'id' | 'created_at'>): QueuedEvent {
  const item: QueuedEvent = {
    ...event,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
  }
  const queue = getQueue()
  const updatedQueue = [...queue, item]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueue))
  return item
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(e => e.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY)
}
