import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckSquare, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

export function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (password.length < 8) e.password = 'Password must be at least 8 characters'
    return e
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const data = await authApi.register(name, email, password)
      login(data)
      navigate('/projects')
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string; fields?: Record<string, string> } } }
      if (apiErr.response?.data?.fields) {
        setErrors(apiErr.response.data.fields)
      } else {
        setErrors({ form: apiErr.response?.data?.error ?? 'Registration failed' })
      }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Create account</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Start managing tasks with TaskFlow</p>
        </div>

        <div className="card p-6">
          {errors.form && (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aman Jain"
                autoFocus
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 dark:text-green-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
