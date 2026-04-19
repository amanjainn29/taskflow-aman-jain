import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Trash2, ChevronRight, Loader2 } from 'lucide-react'
import { projectsApi } from '../api/projects'
import { Navbar } from '../components/Navbar'

export function Projects() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create(name, description || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setName('')
      setDescription('')
      setShowForm(false)
      setFormError('')
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      setFormError(e.response?.data?.error ?? 'Failed to create project')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Project name is required')
      return
    }

    setFormError('')
    createMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            <Plus size={16} />
            New Project
          </button>
        </div>

        {showForm && (
          <div className="card p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Create New Project</h2>
            {formError && (
              <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Project Name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Greening India Platform"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional short description"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormError('')
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        )}

        {isError && (
          <div className="card p-8 text-center">
            <p className="text-red-500 dark:text-red-400 font-medium">Failed to load projects</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Please refresh the page</p>
          </div>
        )}

        {!isLoading && !isError && projects.length === 0 && (
          <div className="card p-12 text-center">
            <FolderOpen className="mx-auto text-gray-300 dark:text-slate-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-slate-400 font-medium">No projects yet</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
              Create your first project to get started
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={16} /> Create Project
            </button>
          </div>
        )}

        {!isLoading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                          {project.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        Created {new Date(project.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${project.name}"? This will also delete all its tasks.`)) {
                          deleteMutation.mutate(project.id)
                        }
                      }}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-green-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
