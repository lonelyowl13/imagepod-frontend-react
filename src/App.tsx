import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Endpoints from '@/pages/Endpoints'
import EndpointDetail from '@/pages/EndpointDetail'
import CreateEndpoint from '@/pages/CreateEndpoint'
import Templates from '@/pages/Templates'
import TemplateDetail from '@/pages/TemplateDetail'
import Executors from '@/pages/Executors'
import Volumes from '@/pages/Volumes'
import VolumeDetail from '@/pages/VolumeDetail'
import ApiKeys from '@/pages/ApiKeys'
import Settings from '@/pages/Settings'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth()
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-800">
        <span className="text-gray-400">Loading…</span>
      </div>
    )
  }
  if (state.status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="endpoints" element={<Endpoints />} />
        <Route path="endpoints/new" element={<CreateEndpoint />} />
        <Route path="endpoints/:id" element={<EndpointDetail />} />
        <Route path="templates" element={<Templates />} />
        <Route path="templates/:id" element={<TemplateDetail />} />
        <Route path="executors" element={<Executors />} />
        <Route path="volumes" element={<Volumes />} />
        <Route path="volumes/:id" element={<VolumeDetail />} />
        <Route path="keys" element={<ApiKeys />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
