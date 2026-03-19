'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Plus, Flag, ChevronDown, ChevronUp, User2,
} from 'lucide-react'
import { toast } from 'sonner'

import { type Todo, type TodosClientProps, PRIORITY_CONFIG } from './todo-types'
import { QuickDatePicker } from './quick-date-picker'
import { TodoRow } from './todo-row'

export function TodosClient({ initialTodos, currentUserId, members, memberMap }: TodosClientProps) {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [showAdd, setShowAdd] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState('Tutte')
  const [sortBy, setSortBy] = useState('dueDate')

  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignee, setNewAssignee] = useState(currentUserId)
  const [adding, setAdding] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const pending = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  const priorityMap: Record<string, string> = { 'Alta': 'high', 'Media': 'medium', 'Bassa': 'low' }
  const filteredPending = pending.filter(t => priorityFilter === 'Tutte' || t.priority === (priorityMap[priorityFilter] ?? priorityFilter.toLowerCase()))

  const sortedPending = [...filteredPending].sort((a, b) => {
    if (sortBy === 'priority') {
      const pOrder = { high: 0, medium: 1, low: 2 }
      return pOrder[a.priority] - pOrder[b.priority]
    }
    if (sortBy === 'createdAt') return b.created_at.localeCompare(a.created_at)
    // Default: dueDate
    const pOrder = { high: 0, medium: 1, low: 2 }
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority]
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })

  const openAdd = useCallback(() => {
    setShowAdd(true)
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  const closeAdd = useCallback(() => {
    setShowAdd(false)
    setNewTitle('')
    setNewNotes('')
    setNewPriority('medium')
    setNewDueDate('')
    setNewAssignee(currentUserId)
  }, [currentUserId])

  // Global keyboard: '+' opens add form, Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '+' || e.key === 'n') openAdd()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAdd])

  async function handleAdd() {
    if (!newTitle.trim() || adding) return
    setAdding(true)

    const payload = {
      title: newTitle.trim(),
      notes: newNotes || null,
      priority: newPriority,
      due_date: newDueDate || null,
      assigned_to: newAssignee,
    }

    const tempId = `temp-${Date.now()}`
    const tempTodo: Todo = {
      id: tempId,
      ...payload,
      completed: false,
      completed_at: null,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
    }
    setTodos(prev => [tempTodo, ...prev])
    closeAdd()

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTodos(prev => prev.map(t => t.id === tempId ? json.todo : t))
      if (payload.assigned_to !== currentUserId) {
        toast.success(`To do assegnato a ${memberMap[payload.assigned_to] ?? 'collega'}`)
      }
    } catch {
      setTodos(prev => prev.filter(t => t.id !== tempId))
      toast.error('Errore durante la creazione')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(todo: Todo) {
    const newCompleted = !todo.completed
    setTodos(prev => prev.map(t =>
      t.id === todo.id
        ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : t
    ))
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setTodos(prev => prev.map(t =>
        t.id === todo.id
          ? { ...t, completed: todo.completed, completed_at: todo.completed_at }
          : t
      ))
      toast.error('Errore durante il salvataggio')
    }
  }

  async function handleDelete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id))
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch {
      // silent
    }
  }

  const hasMultipleMembers = members.length > 1

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-in-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">To Do</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pending.length === 0
              ? 'Tutto completato 🎉'
              : `${pending.length} ${pending.length === 1 ? 'attività' : 'attività'} in sospeso`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="btn-ai flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
          <span className="ml-1 rounded bg-white/20 px-1 py-0.5 text-[10px] font-mono leading-none">N</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {['Tutte', 'Alta', 'Media', 'Bassa'].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
              priorityFilter === p ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-muted'
            }`}>{p}</button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="ml-auto rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <option value="dueDate">Per scadenza</option>
          <option value="priority">Per priorità</option>
          <option value="createdAt">Per data creazione</option>
        </select>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          ref={formRef}
          className="animate-in-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
        >
          {/* Title row */}
          <div className="px-4 pt-4 pb-2">
            <input
              ref={titleRef}
              type="text"
              placeholder="Cosa devi fare?"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
                if (e.key === 'Escape') closeAdd()
              }}
              className="w-full text-base font-medium placeholder:text-muted-foreground outline-none bg-transparent"
            />
          </div>

          {/* Notes row */}
          <div className="px-4 pb-3">
            <textarea
              placeholder="Note (opzionale)"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') closeAdd() }}
              rows={2}
              className="w-full text-sm text-muted-foreground placeholder:text-muted-foreground/60 outline-none resize-none bg-transparent"
            />
          </div>

          {/* Toolbar */}
          <div className="border-t border-border bg-muted/30 px-4 py-2.5 space-y-2.5">
            {/* Priority row */}
            <div className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1">
                {(['high', 'medium', 'low'] as const).map(p => {
                  const cfg = PRIORITY_CONFIG[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium border transition-colors ${
                        newPriority === p
                          ? `${cfg.bg} ${cfg.color}`
                          : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Due date row */}
            <QuickDatePicker value={newDueDate} onChange={setNewDueDate} />

            {/* Assignee row */}
            {hasMultipleMembers && (
              <div className="flex items-center gap-1.5">
                <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="text-xs text-foreground bg-transparent outline-none cursor-pointer"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.id === currentUserId ? 'Me stesso' : m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
            <button
              onClick={closeAdd}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || adding}
              className="btn-ai rounded-xl px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Pending todos */}
      {sortedPending.length === 0 && !showAdd ? (
        <div className="mesh-bg flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.57_0.20_33/0.15)] to-[oklch(0.66_0.15_188/0.15)] ring-1 ring-[oklch(0.57_0.20_33/0.2)]">
            <CheckCircle2 className="h-7 w-7 text-[oklch(0.57_0.20_33)]" />
          </div>
          <p className="text-sm font-semibold">Nessun to do in sospeso</p>
          <p className="text-xs text-muted-foreground mt-1">
            Premi <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">N</kbd> o clicca &ldquo;Aggiungi&rdquo;
          </p>
        </div>
      ) : (
        <div className="animate-in-3 divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
          {sortedPending.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              currentUserId={currentUserId}
              memberMap={memberMap}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowCompleted(prev => !prev)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
          >
            {showCompleted ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Completati ({completed.length})
          </button>
          {showCompleted && (
            <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
              {completed.map(todo => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  currentUserId={currentUserId}
                  memberMap={memberMap}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
