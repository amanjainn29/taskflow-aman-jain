import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckSquare, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Email is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      login(data)
      navigate('/projects')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-600 rounded-xl mb-3">
            <CheckSquare className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Sign in to your TaskFlow account</p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-green-600 dark:text-green-400 font-medium hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-4 card p-3 text-xs text-center text-gray-500 dark:text-slate-400">
          <strong>Demo:</strong> test@example.com / password123
        </div>
      </div>
    </div>
  )
}
