import { client } from './client'
import type { Project, ProjectStats } from '../types'

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await client.get<{ projects: Project[] }>('/projects')
    return res.data.projects
  },

  get: async (id: string): Promise<Project> => {
    const res = await client.get<Project>(`/projects/${id}`)
    return res.data
  },

  create: async (name: string, description?: string): Promise<Project> => {
    const res = await client.post<Project>('/projects', { name, description: description || null })
    return res.data
  },

  update: async (id: string, name: string, description?: string): Promise<Project> => {
    const res = await client.patch<Project>(`/projects/${id}`, { name, description: description || null })
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await client.delete(`/projects/${id}`)
  },

  stats: async (id: string): Promise<ProjectStats> => {
    const res = await client.get<ProjectStats>(`/projects/${id}/stats`)
    return res.data
  },
}
