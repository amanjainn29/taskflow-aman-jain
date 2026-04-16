import { useState, useEffect, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../api/tasks'
import type { Task, TaskPriority } from '../types'
import { clsx } from 'clsx'

interface Props {
  projectId: string
  task?: Task | null
  onClose: () => void
}

export function TaskModal({ projectId, task, onClose }: Props) {
  const qc = useQueryClient()
  const isEdit = !!task

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.due_date?.split('T')[0] ?? '')
  const [error, setError] = useState('')

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return tasksApi.update(task.id, {
          title,
          description: description || undefined,
          priority,
          due_date: dueDate || null,
        })
      }
      return tasksApi.create(projectId, {
        title,
        description: description || undefined,
        priority,
        due_date: dueDate || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      onClose()
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error ?? 'Something went wrong')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setError('')
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative card w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={clsx(
                      'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors capitalize',
                      priority === p
                        ? p === 'low' ? 'bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 text-gray-800 dark:text-slate-100'
                          : p === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
