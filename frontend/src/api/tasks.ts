import { client } from './client'
import type { Task, TaskStatus, TaskPriority } from '../types'

interface CreateTaskInput {
  title: string
  description?: string | null
  priority: TaskPriority
  assignee_id?: string
  due_date?: string
}

interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string | null
  due_date?: string | null
}

export const tasksApi = {
  list: async (projectId: string, status?: string, assignee?: string): Promise<Task[]> => {
    const params: Record<string, string> = {}
    if (status) params.status = status
    if (assignee) params.assignee = assignee
    const res = await client.get<{ tasks: Task[] }>(`/projects/${projectId}/tasks`, { params })
    return res.data.tasks
  },

  create: async (projectId: string, input: CreateTaskInput): Promise<Task> => {
    const res = await client.post<Task>(`/projects/${projectId}/tasks`, input)
    return res.data
  },

  update: async (id: string, input: UpdateTaskInput): Promise<Task> => {
    const res = await client.patch<Task>(`/tasks/${id}`, input)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/tasks/${id}`)
  },
}
