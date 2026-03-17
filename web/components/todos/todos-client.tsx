'use client'

import { useState, useOptimistic, useTransition, useCallback } from 'react'
import { CheckCircle2, Circle, Trash2, Plus, Send, UserRound } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

export interface TodoItem {
  id: string
  title: string
  completed: boolean
  completed_at: string | null
  created_at: string
  created_by: string
  assigned_to: string
}

export interface WorkspaceMember {
  id: string
  name: string
}

interface Props {
  initialTodos: TodoItem[]
  currentUserId: string
  members: WorkspaceMember[]
}

export function TodosClient({ initialTodos, currentUserId, members }: Props) {
  const { t } = useI18n()
  const [todos, setTodos] = useOptimistic<TodoItem[]>(initialTodos)
  const [isPending, startTransition] = useTransition()
  const [newTitle, setNewTitle] = useState('')
  const [assignTo, setAssignTo] = useState<string>(currentUserId)
  const [submitting, setSubmitting] = useState(false)

  const pendingTodos = todos.filter(td => !td.completed)
  const completedTodos = todos.filter(td => td.completed)

  const handleToggle = useCallback((todo: TodoItem) => {
    const updated = { ...todo, completed: !todo.completed, completed_at: !todo.completed ? new Date().toISOString() : null }
    startTransition(async () => {
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t))
      await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updated.completed }),
      })
    })
  }, [setTodos])

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      setTodos(prev => prev.filter(t => t.id !== id))
      await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    })
  }, [setTodos])

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), assigned_to: assignTo }),
      })
      const json = await res.json()
      if (json.todo) {
        setTodos(prev => [json.todo as TodoItem, ...prev])
        setNewTitle('')
        setAssignTo(currentUserId)
      }
    } finally {
      setSubmitting(false)
    }
  }, [newTitle, assignTo, submitting, currentUserId, setTodos])

  const memberName = (id: string) => members.find(m => m.id === id)?.name ?? t('todos.unknownUser')

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('todos.title')}</h1>
        <p className="text-neutral-500 text-sm mt-0.5">
          {pendingTodos.length > 0
            ? `${pendingTodos.length} ${t('todos.pending')}`
            : t('todos.allDone')}
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder={t('todos.placeholder')}
          className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          disabled={submitting}
        />
        {members.length > 1 && (
          <select
            value={assignTo}
            onChange={e => setAssignTo(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? t('todos.assignSelf') : m.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={!newTitle.trim() || submitting}
          className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors"
        >
          {assignTo !== currentUserId ? <Send className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {assignTo !== currentUserId ? t('todos.send') : t('todos.add')}
        </button>
      </form>

      {/* Pending todos */}
      {pendingTodos.length === 0 && completedTodos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <div className="mb-4 rounded-full bg-neutral-100 p-4">
            <CheckCircle2 className="h-8 w-8 text-neutral-300" />
          </div>
          <h2 className="text-base font-semibold text-neutral-800">{t('todos.empty.title')}</h2>
          <p className="mt-1 text-sm text-neutral-500 max-w-xs">{t('todos.empty.body')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {pendingTodos.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              currentUserId={currentUserId}
              memberName={memberName}
              onToggle={handleToggle}
              onDelete={handleDelete}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Completed todos */}
      {completedTodos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 px-1">
            {t('todos.completed')} ({completedTodos.length})
          </p>
          <div className="space-y-1 opacity-60">
            {completedTodos.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                currentUserId={currentUserId}
                memberName={memberName}
                onToggle={handleToggle}
                onDelete={handleDelete}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TodoRow({
  todo,
  currentUserId,
  memberName,
  onToggle,
  onDelete,
  isPending,
}: {
  todo: TodoItem
  currentUserId: string
  memberName: (id: string) => string
  onToggle: (todo: TodoItem) => void
  onDelete: (id: string) => void
  isPending: boolean
}) {
  const { t } = useI18n()
  const isAssignedToMe = todo.assigned_to === currentUserId
  const isCreatedByMe = todo.created_by === currentUserId
  const isFromSomeoneElse = !isCreatedByMe && isAssignedToMe

  return (
    <div className={`group flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
      todo.completed ? 'border-neutral-100 bg-white' : 'border-neutral-200 bg-white hover:border-neutral-300'
    }`}>
      <button
        onClick={() => onToggle(todo)}
        disabled={isPending}
        className="mt-0.5 shrink-0 transition-colors hover:text-green-600"
      >
        {todo.completed
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : <Circle className="h-5 w-5 text-neutral-300 group-hover:text-neutral-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${todo.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {isFromSomeoneElse && (
            <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
              <UserRound className="h-3 w-3" />
              {t('todos.from')} {memberName(todo.created_by)}
            </span>
          )}
          {isCreatedByMe && !isAssignedToMe && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-400">
              <Send className="h-3 w-3" />
              {t('todos.sentTo')} {memberName(todo.assigned_to)}
            </span>
          )}
          <span className="text-[11px] text-neutral-400">
            {new Date(todo.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        disabled={isPending}
        className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
