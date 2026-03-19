'use client'

import React from 'react'
import { CheckCircle2, Circle, Trash2, Flag, Calendar } from 'lucide-react'
import { type Todo, PRIORITY_CONFIG, isOverdue, isToday, dueDateLabel } from './todo-types'

function TodoRowInner({
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

  const isHighPriority = todo.priority === 'high' && !todo.completed
  const isDueWithin24h = todo.due_date && !todo.completed && (() => {
    const due = new Date(todo.due_date + 'T23:59:59')
    const diff = due.getTime() - Date.now()
    return diff > 0 && diff <= 24 * 60 * 60 * 1000
  })()

  return (
    <div className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
      todo.completed ? 'bg-muted/20' :
      isHighPriority ? 'border-l-4 border-l-red-500 bg-red-50/30 hover:bg-red-50/50 dark:bg-red-950/20 dark:hover:bg-red-950/30' :
      'hover:bg-muted/40'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        className="mt-0.5 shrink-0"
        aria-label={todo.completed ? 'Segna come da fare' : 'Segna come completato'}
      >
        {todo.completed
          ? <CheckCircle2 className="h-5 w-5 text-muted-foreground/30" />
          : <Circle className={`h-5 w-5 ${pCfg.color} hover:scale-110 transition-transform`} />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${todo.completed ? 'line-through text-muted-foreground/40' : ''}`}>
          {todo.title}
        </p>
        {todo.notes && !todo.completed && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{todo.notes}</p>
        )}
        {!todo.completed && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority badge */}
            {todo.priority === 'high' ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white">
                <Flag className="h-2.5 w-2.5" />
                {pCfg.label}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${pCfg.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${pCfg.dot}`} />
                {pCfg.label}
              </span>
            )}
            {/* Due date chip */}
            {dateLabel && (
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium border ${
                overdue
                  ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
                  : today || isDueWithin24h
                    ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                    : 'bg-muted border-border text-muted-foreground'
              }`}>
                <Calendar className="h-2.5 w-2.5" />
                {overdue ? `Scaduto · ${dateLabel}` : isDueWithin24h ? `⚡ ${dateLabel}` : dateLabel}
              </span>
            )}
            {/* From / To */}
            {isFromSomeoneElse && (
              <span className="text-[11px] text-[oklch(0.57_0.20_33)] font-medium">Da {memberMap[todo.created_by] ?? 'collega'}</span>
            )}
            {isSentByMe && (
              <span className="text-[11px] text-muted-foreground">→ {memberMap[todo.assigned_to] ?? 'collega'}</span>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 hover:text-red-400"
        aria-label="Elimina"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

export const TodoRow = React.memo(TodoRowInner)
