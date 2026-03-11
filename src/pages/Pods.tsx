import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listPods } from '@/lib/pods-api'
import type { PodResponse } from '@/types/api'

const STATUS_STYLE: Record<string, string> = {
  RUNNING: 'bg-green-500/20 text-green-400',
  STOPPED: 'bg-surface-600 text-gray-400',
  TERMINATED: 'bg-red-500/20 text-red-400',
}
const DEFAULT_STATUS_STYLE = 'bg-surface-600 text-gray-400'

export default function Pods() {
  const { getAccessToken } = useAuth()
  const [pods, setPods] = useState<PodResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    listPods(token)
      .then(setPods)
      .catch(() => setError('Failed to load pods'))
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
          <h1 className="text-2xl font-semibold text-gray-100">Pods</h1>
          <p className="text-gray-400 text-sm mt-1">Long-lived runnable instances on your executors</p>
        </div>
        <Link
          to="/pods/new"
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
        >
          Create pod
        </Link>
      </div>

      {pods.length === 0 ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No pods yet. Create a template and add an executor, then create a pod.
        </div>
      ) : (
        <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
          {pods.map((pod) => (
            <li key={pod.id}>
              <Link
                to={`/pods/${pod.id}`}
                className="block px-4 py-4 hover:bg-surface-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-200">{pod.name}</span>
                    <span className="text-gray-500 text-sm font-mono">#{pod.id}</span>
                    {pod.status && (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[pod.status] ?? DEFAULT_STATUS_STYLE}`}>
                        {pod.status}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    {pod.template?.name ?? 'Unknown template'} · Executor #{pod.executor_id}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {pod.vcpu_count} vCPU · {pod.ports?.length ? `${pod.ports.length} port(s)` : 'No ports'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
