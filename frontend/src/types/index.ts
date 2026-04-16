export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface User {
  id: string
  name: string
  email: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  tasks?: Task[]
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  project_id: string
  creator_id: string
  assignee_id: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface AuthState {
  token: string
  user: User
}

export interface ApiError {
  error: string
  fields?: Record<string, string>
}

export interface ProjectStats {
  total_tasks: number
  by_status: Record<string, number>
  by_assignee: Record<string, number>
}
