import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AuthState, User } from '../types'

const STORAGE_KEY = 'taskflow_auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (data: AuthState) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const login = useCallback((data: AuthState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setAuth(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user ?? null,
        token: auth?.token ?? null,
        isAuthenticated: !!auth?.token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
