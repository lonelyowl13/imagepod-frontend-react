import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { formatBytes } from '@/lib/format'
import {
  listExecutors,
  addExecutor,
  shareExecutor,
  unshareExecutor,
  listExecutorShares,
  deleteExecutor,
} from '@/lib/executors-api'
import { listEndpoints } from '@/lib/endpoints-api'
import type { ExecutorSummary, ExecutorAddResponse, ExecutorShareResponse } from '@/types/api'
import { ApiError } from '@/lib/api'

export default function Executors() {
  const { getAccessToken } = useAuth()
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [endpointCountByExecutor, setEndpointCountByExecutor] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<ExecutorAddResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedShareExecutorId, setExpandedShareExecutorId] = useState<number | null>(null)
  const [shareUsername, setShareUsername] = useState('')
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareSubmitting, setShareSubmitting] = useState(false)
  const [sharesByExecutor, setSharesByExecutor] = useState<Record<number, ExecutorShareResponse[]>>({})

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    listExecutors(token)
      .then(setExecutors)
      .catch(() => setError('Failed to load executors'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = getAccessToken()
    if (!token || executors.length === 0) return
    listEndpoints(token)
      .then((endpoints) => {
        const count: Record<number, number> = {}
        endpoints.forEach((ep) => {
          count[ep.executor_id] = (count[ep.executor_id] ?? 0) + 1
        })
        setEndpointCountByExecutor(count)
      })
      .catch(() => {})
  }, [getAccessToken, executors])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setNewKey(null)
    setSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    try {
      const result = await addExecutor(token, { name })
      setNewKey(result)
      setShowForm(false)
      setName('')
      load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to add executor')
    } finally {
      setSubmitting(false)
    }
  }

  function copyKey() {
    if (newKey?.api_key) {
      navigator.clipboard.writeText(newKey.api_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  function isOwnedExecutor(ex: ExecutorSummary) {
    return !ex.is_shared
  }

  async function loadShares(executorId: number) {
    const token = getAccessToken()
    if (!token) return
    try {
      const shares = await listExecutorShares(token, executorId)
      setSharesByExecutor((prev) => ({ ...prev, [executorId]: shares }))
    } catch {
      setSharesByExecutor((prev) => ({ ...prev, [executorId]: [] }))
    }
  }

  function handleExpandShare(ex: ExecutorSummary) {
    if (expandedShareExecutorId === ex.id) {
      setExpandedShareExecutorId(null)
      setShareUsername('')
      setShareError(null)
    } else {
      setExpandedShareExecutorId(ex.id)
      setShareUsername('')
      setShareError(null)
      loadShares(ex.id)
    }
  }

  async function handleShare(e: React.FormEvent, executorId: number) {
    e.preventDefault()
    setShareError(null)
    setShareSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    try {
      await shareExecutor(token, executorId, shareUsername.trim())
      setShareUsername('')
      loadShares(executorId)
    } catch (err) {
      setShareError(err instanceof ApiError ? err.message : 'Failed to share')
    } finally {
      setShareSubmitting(false)
    }
  }

  async function handleUnshare(executorId: number, username: string) {
    const token = getAccessToken()
    if (!token || !confirm(`Revoke access for ${username}?`)) return
    try {
      await unshareExecutor(token, executorId, username)
      loadShares(executorId)
    } catch {
      setError('Failed to revoke share')
    }
  }

  async function handleDeleteExecutor(executorId: number) {
    if (!confirm('Delete this executor and all associated resources? This cannot be undone.')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deleteExecutor(token, executorId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete executor')
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Executors</h1>
          <p className="text-gray-400 text-sm mt-1">GPU workers that run your endpoints. Add one and run the executor with the API key.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
        >
          Add executor
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-6 rounded-xl bg-accent-muted border border-accent/30 p-4">
          <p className="text-sm text-gray-300 mb-2">Executor added. Copy the API key now — it won’t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-surface-800 px-3 py-2 text-sm font-mono text-accent break-all">
              {newKey.api_key}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-3 py-2 text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Executor ID: {newKey.executor_id}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-xl bg-surface-700 border border-surface-500 p-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">Add executor</h2>
          <form onSubmit={handleAdd} className="space-y-4 max-w-md">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. my-gpu-server"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
              >
                {submitting ? 'Adding…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {executors.length === 0 && !showForm ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No executors. Add one and run the executor process with the API key on your GPU machine.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {executors.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl bg-surface-700 border border-surface-500 p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-gray-200">
                    {ex.name ?? `Executor #${ex.id}`}
                  </h3>
                  <p className="text-gray-500 text-sm font-mono mt-0.5">ID {ex.id}</p>
                  {ex.is_shared && ex.owner && (
                    <p className="text-gray-400 text-xs mt-1">Owner: {ex.owner}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ex.is_shared && (
                    <span className="rounded px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400">
                      Shared with you
                    </span>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ex.is_active
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-surface-600 text-gray-500'
                    }`}
                  >
                    {ex.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 text-sm">
                {ex.compute_type && (
                  <div>
                    <dt className="text-gray-500">Compute type</dt>
                    <dd className="font-mono text-gray-300">{ex.compute_type}</dd>
                  </div>
                )}
                {ex.gpu && (
                  <div>
                    <dt className="text-gray-500">GPU</dt>
                    <dd className="font-mono text-gray-300">{ex.gpu}</dd>
                  </div>
                )}
                {ex.cpu && (
                  <div>
                    <dt className="text-gray-500">CPU</dt>
                    <dd className="font-mono text-gray-300 truncate" title={ex.cpu}>{ex.cpu}</dd>
                  </div>
                )}
                {ex.ram != null && (
                  <div>
                    <dt className="text-gray-500">RAM</dt>
                    <dd className="font-mono text-gray-300">{formatBytes(ex.ram)}</dd>
                  </div>
                )}
                {ex.vram != null && (
                  <div>
                    <dt className="text-gray-500">VRAM</dt>
                    <dd className="font-mono text-gray-300">{formatBytes(ex.vram)}</dd>
                  </div>
                )}
                {ex.last_heartbeat && (
                  <div>
                    <dt className="text-gray-500">Last heartbeat</dt>
                    <dd className="text-gray-300">
                      {new Date(ex.last_heartbeat).toLocaleString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Added</dt>
                  <dd className="text-gray-300">
                    {new Date(ex.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Endpoints</dt>
                  <dd className="text-gray-300">
                    {endpointCountByExecutor[ex.id] ?? 0} endpoint{(endpointCountByExecutor[ex.id] ?? 0) === 1 ? '' : 's'}
                  </dd>
                </div>
              </dl>
              {isOwnedExecutor(ex) && (
                <div className="mt-4 pt-4 border-t border-surface-500">
                  <button
                    type="button"
                    onClick={() => handleExpandShare(ex)}
                    className="text-sm text-accent hover:text-accent-hover font-medium"
                  >
                    {expandedShareExecutorId === ex.id ? 'Hide sharing' : 'Share with user'}
                  </button>
                  {expandedShareExecutorId === ex.id && (
                    <div className="mt-3 space-y-3">
                      <form
                        onSubmit={(e) => handleShare(e, ex.id)}
                        className="flex gap-2 items-end"
                      >
                        <div className="flex-1 min-w-0">
                          <label className="block text-xs text-gray-500 mb-0.5">Username</label>
                          <input
                            type="text"
                            value={shareUsername}
                            onChange={(e) => setShareUsername(e.target.value)}
                            placeholder="e.g. alice"
                            className="w-full rounded bg-surface-600 border border-surface-500 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={shareSubmitting || !shareUsername.trim()}
                          className="rounded bg-accent hover:bg-accent-hover text-surface-800 font-medium px-3 py-1.5 text-sm disabled:opacity-50"
                        >
                          {shareSubmitting ? 'Sharing…' : 'Share'}
                        </button>
                      </form>
                      {shareError && (
                        <p className="text-red-400 text-sm">{shareError}</p>
                      )}
                      {(sharesByExecutor[ex.id]?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Shared with:</p>
                          <ul className="space-y-1">
                            {sharesByExecutor[ex.id]?.map((s) => (
                              <li
                                key={s.username}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-300">{s.username}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUnshare(ex.id, s.username)}
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  Revoke
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-5 pt-4 border-t border-surface-500">
                    <button
                      type="button"
                      onClick={() => handleDeleteExecutor(ex.id)}
                      className="text-sm text-red-400 hover:text-red-300 font-medium"
                    >
                      Delete executor
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
