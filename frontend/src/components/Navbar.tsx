import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, CheckSquare } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'

export function Navbar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useDarkMode()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/projects" className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400 text-lg">
          <CheckSquare size={22} />
          TaskFlow
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <>
              <span className="hidden sm:block text-sm text-gray-600 dark:text-slate-300 font-medium">
                {user.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
