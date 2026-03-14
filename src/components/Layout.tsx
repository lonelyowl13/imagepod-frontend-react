import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/endpoints', label: 'Endpoints' },
  { to: '/pods', label: 'Pods' },
  { to: '/templates', label: 'Templates' },
  { to: '/executors', label: 'Executors' },
  { to: '/volumes', label: 'Volumes' },
  { to: '/keys', label: 'API Keys' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface-700 border-b border-surface-500 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="font-mono font-semibold text-accent text-lg">
            ImagePod
          </NavLink>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-muted text-accent'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-surface-600'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={logout}
              className="ml-4 px-3 py-2 text-sm text-gray-400 hover:text-gray-200"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
