import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, ArrowLeft, Loader2, ClipboardList,
  CheckCircle2, Clock, Circle, BarChart3, Pencil, Check, X
} from 'lucide-react'
import { projectsApi } from '../api/projects'
import { tasksApi } from '../api/tasks'
import { TaskCard } from '../components/TaskCard'
import { TaskModal } from '../components/TaskModal'
import { Navbar } from '../components/Navbar'
import type { Task, TaskStatus } from '../types'
import { clsx } from 'clsx'

const COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'todo',        label: 'To Do',       icon: <Circle size={14} />,        color: 'text-gray-500 dark:text-slate-400' },
  { status: 'in_progress', label: 'In Progress',  icon: <Clock size={14} />,         color: 'text-blue-500' },
  { status: 'done',        label: 'Done',         icon: <CheckCircle2 size={14} />,  color: 'text-green-500' },
]

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [showStats, setShowStats] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', id],
    queryFn: () => projectsApi.stats(id!),
    enabled: !!id && showStats,
  })

  const { data: filteredTasks } = useQuery({
    queryKey: ['tasks', id, statusFilter],
    queryFn: () => tasksApi.list(id!, statusFilter || undefined),
    enabled: !!id && statusFilter !== '',
  })

  const updateProjectMutation = useMutation({
    mutationFn: (name: string) => projectsApi.update(id!, name, project?.description ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      setEditingName(false)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-green-600" size={36} />
        </div>
      </div>
    )
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-red-500 font-medium">Project not found</p>
          <button onClick={() => navigate('/projects')} className="btn-secondary mt-4">
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const tasks = project.tasks ?? []
  const displayTasks = statusFilter !== '' ? (filteredTasks ?? []) : tasks

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = displayTasks.filter((t) => t.status === col.status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 mb-5 transition-colors"
        >
          <ArrowLeft size={15} /> All Projects
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="input text-xl font-bold max-w-xs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateProjectMutation.mutate(newName)
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <button onClick={() => updateProjectMutation.mutate(newName)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {project.name}
                </h1>
                <button
                  onClick={() => { setNewName(project.name); setEditingName(true) }}
                  className="p-1 rounded text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowStats((v) => !v)}
              className={clsx('btn-secondary', showStats && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400')}
            >
              <BarChart3 size={15} /> Stats
            </button>
            <button onClick={() => { setEditingTask(null); setShowTaskModal(true) }} className="btn-primary">
              <Plus size={15} /> Add Task
            </button>
          </div>
        </div>

        {/* Stats panel */}
        {showStats && stats && (
          <div className="card p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.total_tasks}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Total Tasks</p>
            </div>
            {COLUMNS.map((col) => (
              <div key={col.status} className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stats.by_status[col.status] ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{col.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap shrink-0">Filter:</span>
          {[{ value: '', label: 'All' }, ...COLUMNS.map((c) => ({ value: c.status, label: c.label }))].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value as TaskStatus | '')}
              className={clsx(
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap',
                statusFilter === f.value
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-green-400'
              )}
            >
              {f.label}
              {f.value !== '' && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  {tasksByStatus[f.value as TaskStatus]?.length ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task board — 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus[col.status] ?? []
            return (
              <div key={col.status}>
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className={clsx('flex items-center gap-1.5 text-sm font-semibold', col.color)}>
                    {col.icon}
                    {col.label}
                  </div>
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-medium">
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 min-h-[120px]">
                  {colTasks.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center">
                      <ClipboardList size={20} className="mx-auto text-gray-300 dark:text-slate-600 mb-1" />
                      <p className="text-xs text-gray-400 dark:text-slate-500">No tasks</p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        projectId={project.id}
                        onEdit={(t) => { setEditingTask(t); setShowTaskModal(true) }}
                      />
                    ))
                  )}
                </div>

                {/* Quick add */}
                {col.status === 'todo' && (
                  <button
                    onClick={() => { setEditingTask(null); setShowTaskModal(true) }}
                    className="mt-2 w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 transition-colors"
                  >
                    <Plus size={13} /> Add task
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Task create/edit modal */}
      {showTaskModal && (
        <TaskModal
          projectId={project.id}
          task={editingTask}
          onClose={() => { setShowTaskModal(false); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
