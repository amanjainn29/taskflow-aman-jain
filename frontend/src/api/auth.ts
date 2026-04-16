import { client } from './client'
import type { AuthState } from '../types'

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<AuthState> => {
    const res = await client.post<AuthState>('/auth/register', { name, email, password })
    return res.data
  },

  login: async (email: string, password: string): Promise<AuthState> => {
    const res = await client.post<AuthState>('/auth/login', { email, password })
    return res.data
  },
}
