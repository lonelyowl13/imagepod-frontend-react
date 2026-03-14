import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listEndpoints } from '@/lib/endpoints-api'
import { listPods } from '@/lib/pods-api'
import { listTemplates } from '@/lib/templates-api'
import { listExecutors } from '@/lib/executors-api'
import type { EndpointResponse, PodResponse } from '@/types/api'

export default function Dashboard() {
  const { getAccessToken } = useAuth()
  const [endpoints, setEndpoints] = useState<EndpointResponse[]>([])
  const [pods, setPods] = useState<PodResponse[]>([])
  const [templateCount, setTemplateCount] = useState(0)
  const [executorCount, setExecutorCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    Promise.all([
      listEndpoints(token),
      listPods(token),
      listTemplates(token),
      listExecutors(token),
    ])
      .then(([eps, podList, templates, executors]) => {
        setEndpoints(eps)
        setPods(podList)
        setTemplateCount(templates.length)
        setExecutorCount(executors.length)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error) return <p className="text-red-400">{error}</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">Dashboard</h1>
      <p className="text-gray-400 mb-8">Overview of your ImagePod resources</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link
          to="/endpoints"
          className="rounded-xl bg-surface-700 border border-surface-500 p-6 hover:border-accent/50 transition-colors"
        >
          <span className="text-3xl font-mono font-semibold text-accent">{endpoints.length}</span>
          <p className="text-gray-400 mt-1">Endpoints</p>
        </Link>
        <Link
          to="/pods"
          className="rounded-xl bg-surface-700 border border-surface-500 p-6 hover:border-accent/50 transition-colors"
        >
          <span className="text-3xl font-mono font-semibold text-accent">{pods.length}</span>
          <p className="text-gray-400 mt-1">Pods</p>
        </Link>
        <Link
          to="/templates"
          className="rounded-xl bg-surface-700 border border-surface-500 p-6 hover:border-accent/50 transition-colors"
        >
          <span className="text-3xl font-mono font-semibold text-accent">{templateCount}</span>
          <p className="text-gray-400 mt-1">Templates</p>
        </Link>
        <Link
          to="/executors"
          className="rounded-xl bg-surface-700 border border-surface-500 p-6 hover:border-accent/50 transition-colors"
        >
          <span className="text-3xl font-mono font-semibold text-accent">{executorCount}</span>
          <p className="text-gray-400 mt-1">Executors</p>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-medium text-gray-200 mb-3">Recent endpoints</h2>
        {endpoints.length === 0 ? (
          <p className="text-gray-500">
            No endpoints yet. Create a template and an executor, then{' '}
            <Link to="/endpoints" className="text-accent hover:underline">
              create an endpoint
            </Link>
            .
          </p>
        ) : (
          <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
            {endpoints.slice(0, 5).map((ep) => (
              <li key={ep.id}>
                <Link
                  to={`/endpoints/${ep.id}`}
                  className="block px-4 py-3 hover:bg-surface-600 transition-colors"
                >
                  <span className="font-medium text-gray-200">{ep.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {ep.template?.name ?? 'Unknown template'} on executor #{ep.executor_id}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-200 mb-3">Recent pods</h2>
        {pods.length === 0 ? (
          <p className="text-gray-500">
            No pods yet. Create a template and an executor, then{' '}
            <Link to="/pods/new" className="text-accent hover:underline">
              create a pod
            </Link>
            .
          </p>
        ) : (
          <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
            {pods.slice(0, 5).map((pod) => (
              <li key={pod.id}>
                <Link
                  to={`/pods/${pod.id}`}
                  className="block px-4 py-3 hover:bg-surface-600 transition-colors"
                >
                  <span className="font-medium text-gray-200">{pod.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {pod.template?.name ?? 'Unknown template'} on executor #{pod.executor_id} · {pod.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
