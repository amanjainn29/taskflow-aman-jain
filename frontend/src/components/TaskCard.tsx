import { useState } from 'react'
import { Pencil, Trash2, Calendar, ChevronDown } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import type { Task, TaskStatus } from '../types'
import { clsx } from 'clsx'

interface Props {
  task: Task
  projectId: string
  onEdit: (task: Task) => void
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'done'],
  in_progress: ['todo', 'done'],
  done: ['todo', 'in_progress'],
}

export function TaskCard({ task, projectId, onEdit }: Props) {
  const qc = useQueryClient()
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus | null>(null)

  const currentStatus = optimisticStatus ?? task.status

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(task.id, { status }),
    onMutate: (status) => {
      setOptimisticStatus(status)
      setShowStatusMenu(false)
    },
    onSuccess: () => {
      setOptimisticStatus(null)
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
    onError: () => {
      setOptimisticStatus(null) // revert
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  const formattedDue = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && currentStatus !== 'done'

  return (
    <div className={clsx(
      'card p-4 hover:shadow-md transition-shadow group',
      currentStatus === 'done' && 'opacity-70'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={clsx(
            'text-sm font-medium text-gray-900 dark:text-slate-100 break-words',
            currentStatus === 'done' && 'line-through text-gray-400 dark:text-slate-500'
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {/* Status badge with dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu((v) => !v)}
            className={clsx('badge-' + currentStatus, 'cursor-pointer flex items-center gap-1')}
          >
            {STATUS_LABELS[currentStatus]}
            <ChevronDown size={10} />
          </button>

          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 z-10 card shadow-lg py-1 min-w-[130px]">
              {NEXT_STATUSES[currentStatus].map((s) => (
                <button
                  key={s}
                  onClick={() => statusMutation.mutate(s)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <span className={clsx('badge-' + task.priority, 'capitalize')}>
          {task.priority}
        </span>

        {/* Due date */}
        {formattedDue && (
          <span className={clsx(
            'inline-flex items-center gap-1 text-xs',
            isOverdue ? 'text-red-500' : 'text-gray-400 dark:text-slate-500'
          )}>
            <Calendar size={11} />
            {formattedDue}
          </span>
        )}
      </div>
    </div>
  )
}
