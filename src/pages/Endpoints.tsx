import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listEndpoints } from '@/lib/endpoints-api'
import type { EndpointResponse } from '@/types/api'

const STATUS_STYLE: Record<string, string> = {
  READY: 'bg-green-500/20 text-green-400',
  DEPLOYING: 'bg-yellow-500/20 text-yellow-400',
  UNHEALTHY: 'bg-red-500/20 text-red-400',
}
const DEFAULT_STATUS_STYLE = 'bg-surface-600 text-gray-400'

export default function Endpoints() {
  const { getAccessToken } = useAuth()
  const [endpoints, setEndpoints] = useState<EndpointResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    listEndpoints(token)
      .then(setEndpoints)
      .catch(() => setError('Failed to load endpoints'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error) return <p className="text-red-400">{error}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Endpoints</h1>
          <p className="text-gray-400 text-sm mt-1">Serverless endpoints backed by your executors</p>
        </div>
        <Link
          to="/endpoints/new"
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
        >
          Create endpoint
        </Link>
      </div>

      {endpoints.length === 0 ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No endpoints yet. Create a template and add an executor, then create an endpoint.
        </div>
      ) : (
        <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
          {endpoints.map((ep) => (
            <li key={ep.id}>
              <Link
                to={`/endpoints/${ep.id}`}
                className="block px-4 py-4 hover:bg-surface-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-200">{ep.name}</span>
                    <span className="text-gray-500 text-sm font-mono">#{ep.id}</span>
                    {ep.status && (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[ep.status] ?? DEFAULT_STATUS_STYLE}`}>
                        {ep.status}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    {ep.template?.name ?? 'Unknown template'} · Executor #{ep.executor_id}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Timeout {ep.execution_timeout_ms / 1000}s · Idle {ep.idle_timeout}s
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
