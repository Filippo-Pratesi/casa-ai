'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, Trash2, Plus, Flag, Calendar,
  ChevronDown, ChevronUp, User2, X,
} from 'lucide-react'
import { toast } from 'sonner'

interface Todo {
  id: string
  title: string
  notes: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_by: string
  assigned_to: string
  created_at: string
}

interface Member {
  id: string
  name: string
}

interface Props {
  initialTodos: Todo[]
  currentUserId: string
  members: Member[]
  memberMap: Record<string, string>
}

const PRIORITY_CONFIG = {
  high:   { label: 'Alta',  color: 'text-red-500',   dot: 'bg-red-500',   ring: 'ring-red-200',   bg: 'bg-red-50 border-red-200' },
  medium: { label: 'Media', color: 'text-amber-500', dot: 'bg-amber-400', ring: 'ring-amber-200', bg: 'bg-amber-50 border-amber-200' },
  low:    { label: 'Bassa', color: 'text-green-500', dot: 'bg-green-400', ring: 'ring-green-200', bg: 'bg-green-50 border-green-200' },
}

// Localized date formatting
function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
function tomorrowISO() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
function nextWeekISO() {
  const d = new Date(); d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

function isOverdue(due_date: string | null, completed: boolean) {
  if (!due_date || completed) return false
  return due_date < todayISO()
}

function isToday(due_date: string | null) {
  return due_date === todayISO()
}

function dueDateLabel(due_date: string | null) {
  if (!due_date) return null
  if (due_date === todayISO()) return 'Oggi'
  if (due_date === tomorrowISO()) return 'Domani'
  return fmtDate(due_date)
}

// ─── Quick Date Picker ────────────────────────────────────────────────────────

function QuickDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showCustom, setShowCustom] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  const presets = [
    { label: 'Oggi',   value: todayISO() },
    { label: 'Domani', value: tomorrowISO() },
    { label: '+7 gg',  value: nextWeekISO() },
  ]

  function handlePreset(v: string) {
    if (value === v) {
      onChange('')        // deselect
      setShowCustom(false)
    } else {
      onChange(v)
      setShowCustom(false)
    }
  }

  function handleCustomClick() {
    setShowCustom(true)
    setTimeout(() => dateRef.current?.showPicker?.(), 50)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
      {presets.map(p => (
        <button
          key={p.label}
          type="button"
          onClick={() => handlePreset(p.value)}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors border ${
            value === p.value
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          {p.label}
        </button>
      ))}
      {/* Custom date button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleCustomClick}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors border ${
            value && !presets.find(p => p.value === value)
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
          }`}
        >
          {value && !presets.find(p => p.value === value) ? fmtDate(value) : 'Altra data'}
        </button>
        <input
          ref={dateRef}
          type="date"
          value={value}
          onChange={e => { onChange(e.target.value); setShowCustom(false) }}
          className={`absolute inset-0 opacity-0 cursor-pointer ${showCustom ? '' : 'pointer-events-none'}`}
          min={todayISO()}
        />
      </div>
      {/* Clear */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-full p-0.5 text-neutral-400 hover:text-neutral-700 transition-colors"
          title="Rimuovi data"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TodosClient({ initialTodos, currentUserId, members, memberMap }: Props) {
  const router = useRouter()
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [showAdd, setShowAdd] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

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

  const sortedPending = [...pending].sort((a, b) => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">To Do</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {pending.length === 0
              ? 'Tutto completato 🎉'
              : `${pending.length} ${pending.length === 1 ? 'attività' : 'attività'} in sospeso`}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
          <span className="ml-1 rounded bg-neutral-700 px-1 py-0.5 text-[10px] font-mono leading-none">N</span>
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          ref={formRef}
          className="rounded-xl border border-neutral-300 bg-white shadow-md overflow-hidden"
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
              className="w-full text-base font-medium text-neutral-900 placeholder:text-neutral-400 outline-none"
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
              className="w-full text-sm text-neutral-600 placeholder:text-neutral-400 outline-none resize-none"
            />
          </div>

          {/* Toolbar */}
          <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-2.5 space-y-2.5">
            {/* Priority row */}
            <div className="flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
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
                          : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
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
                <User2 className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="text-xs text-neutral-700 bg-transparent outline-none cursor-pointer"
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
          <div className="flex justify-end gap-2 border-t border-neutral-100 px-4 py-2.5">
            <button
              onClick={closeAdd}
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || adding}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors"
            >
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Pending todos */}
      {sortedPending.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-neutral-200 mb-3" />
          <p className="text-sm font-medium text-neutral-600">Nessun to do in sospeso</p>
          <p className="text-xs text-neutral-400 mt-1">
            Premi <kbd className="rounded border border-neutral-200 bg-neutral-100 px-1 py-0.5 font-mono text-[10px]">N</kbd> o clicca &ldquo;Aggiungi&rdquo;
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden">
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
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-wide"
          >
            {showCompleted ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Completati ({completed.length})
          </button>
          {showCompleted && (
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden">
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

// ─── Todo Row ─────────────────────────────────────────────────────────────────

function TodoRow({
  todo,
  currentUserId,
  memberMap,
  onToggle,
  onDelete,
}: {
  todo: Todo
  currentUserId: string
  memberMap: Record<string, string>
  onToggle: (t: Todo) => void
  onDelete: (id: string) => void
}) {
  const overdue = isOverdue(todo.due_date, todo.completed)
  const today = isToday(todo.due_date)
  const pCfg = PRIORITY_CONFIG[todo.priority]
  const isFromSomeoneElse = todo.created_by !== currentUserId && todo.assigned_to === currentUserId
  const isSentByMe = todo.created_by === currentUserId && todo.assigned_to !== currentUserId
  const dateLabel = dueDateLabel(todo.due_date)

  return (
    <div className={`flex items-start gap-3 px-4 py-3 group transition-colors ${todo.completed ? 'bg-neutral-50/50' : 'hover:bg-neutral-50/60'}`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 shrink-0"
        aria-label={todo.completed ? 'Segna come da fare' : 'Segna come completato'}
      >
        {todo.completed
          ? <CheckCircle2 className="h-5 w-5 text-neutral-300" />
          : <Circle className={`h-5 w-5 ${pCfg.color} hover:scale-110 transition-transform`} />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${todo.completed ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
          {todo.title}
        </p>
        {todo.notes && !todo.completed && (
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{todo.notes}</p>
        )}
        {!todo.completed && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority dot */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${pCfg.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${pCfg.dot}`} />
              {pCfg.label}
            </span>
            {/* Due date chip */}
            {dateLabel && (
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium border ${
                overdue
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : today
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : 'bg-neutral-100 border-neutral-200 text-neutral-500'
              }`}>
                <Calendar className="h-2.5 w-2.5" />
                {overdue ? `Scaduto · ${dateLabel}` : dateLabel}
              </span>
            )}
            {/* From / To */}
            {isFromSomeoneElse && (
              <span className="text-[11px] text-blue-500 font-medium">Da {memberMap[todo.created_by] ?? 'collega'}</span>
            )}
            {isSentByMe && (
              <span className="text-[11px] text-neutral-400">→ {memberMap[todo.assigned_to] ?? 'collega'}</span>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-300 hover:text-red-400"
        aria-label="Elimina"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
