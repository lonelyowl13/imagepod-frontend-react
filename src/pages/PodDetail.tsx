import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getPod, deletePod, updatePod, startPod, stopPod } from '@/lib/pods-api'
import { listTemplates } from '@/lib/templates-api'
import { listExecutors } from '@/lib/executors-api'
import type {
  PodResponse,
  PodUpdate,
  TemplateResponse,
  ExecutorSummary,
} from '@/types/api'
import { ApiError } from '@/lib/api'
import { envToLines, linesToEnv } from '@/lib/format'

const STATUS_STYLE: Record<string, string> = {
  RUNNING: 'bg-green-500/20 text-green-400',
  STOPPED: 'bg-surface-600 text-gray-400',
  TERMINATED: 'bg-red-500/20 text-red-400',
}
const DEFAULT_STATUS_STYLE = 'bg-surface-600 text-gray-400'

function portsToString(ports: number[] | undefined): string {
  if (!ports || ports.length === 0) return ''
  return ports.join(', ')
}

function parsePorts(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

export default function PodDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [pod, setPod] = useState<PodResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [editForm, setEditForm] = useState<PodUpdate>({})
  const [editFormEnv, setEditFormEnv] = useState('')
  const [editFormPorts, setEditFormPorts] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const podId = id ? parseInt(id, 10) : NaN

  const loadPod = useCallback(() => {
    if (!id || !Number.isFinite(podId)) return
    const token = getAccessToken()
    if (!token) return
    getPod(token, podId)
      .then(setPod)
      .catch(() => setError('Failed to load pod'))
      .finally(() => setLoading(false))
  }, [id, podId, getAccessToken])

  useEffect(() => {
    loadPod()
  }, [loadPod])

  useEffect(() => {
    if (!editing || !getAccessToken()) return
    Promise.all([listTemplates(getAccessToken()!), listExecutors(getAccessToken()!)])
      .then(([t, e]) => {
        setTemplates(t)
        setExecutors(e)
      })
      .catch(() => {})
  }, [editing, getAccessToken])

  const podTemplates = templates.filter((t) => t.is_serverless === false)

  function startEditing() {
    if (!pod) return
    setEditForm({
      name: pod.name,
      template_id: pod.template_id,
      executor_id: pod.executor_id,
      compute_type: pod.compute_type,
      vcpu_count: pod.vcpu_count,
    })
    setEditFormEnv(envToLines(pod.env ?? {}))
    setEditFormPorts(portsToString(pod.ports))
    setEditError(null)
    setEditing(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!pod) return
    setEditError(null)
    setEditSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    const env = linesToEnv(editFormEnv)
    const ports = parsePorts(editFormPorts)
    const body: PodUpdate = {
      ...editForm,
      ...(Object.keys(env).length > 0 && { env }),
      ...(ports.length > 0 && { ports }),
    }
    try {
      const updated = await updatePod(token, pod.id, body)
      setPod(updated)
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update pod')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleStart() {
    if (!pod || pod.status !== 'STOPPED') return
    setActionLoading(true)
    const token = getAccessToken()
    if (!token) return
    try {
      const updated = await startPod(token, pod.id)
      setPod(updated)
    } catch {
      setError('Failed to start pod')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStop() {
    if (!pod || pod.status !== 'RUNNING') return
    setActionLoading(true)
    const token = getAccessToken()
    if (!token) return
    try {
      const updated = await stopPod(token, pod.id)
      setPod(updated)
    } catch {
      setError('Failed to stop pod')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!pod || !confirm('Delete this pod? This cannot be undone.')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deletePod(token, pod.id)
      navigate('/pods')
    } catch {
      setError('Failed to delete pod')
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error || !pod) return <p className="text-red-400">{error ?? 'Pod not found'}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">{pod.name}</h1>
          <p className="text-gray-400 text-sm mt-1 font-mono flex items-center gap-2">
            ID {pod.id} · Template: {pod.template?.name ?? 'Unknown template'} · Executor: {pod.executor_id}
            {pod.status && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[pod.status] ?? DEFAULT_STATUS_STYLE}`}>
                {pod.status}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {pod.status === 'STOPPED' && (
            <button
              type="button"
              onClick={handleStart}
              disabled={actionLoading}
              className="rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 disabled:opacity-50"
            >
              {actionLoading ? 'Starting…' : 'Start'}
            </button>
          )}
          {pod.status === 'RUNNING' && (
            <button
              type="button"
              onClick={handleStop}
              disabled={actionLoading}
              className="rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white font-medium px-4 py-2 disabled:opacity-50"
            >
              {actionLoading ? 'Stopping…' : 'Stop'}
            </button>
          )}
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 text-sm"
          >
            Delete pod
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-xl bg-surface-700 border border-surface-500 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-200 mb-4">Edit pod</h2>
          <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
            {editError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                {editError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Template</label>
              <select
                value={editForm.template_id ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, template_id: Number(e.target.value) }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              >
                {podTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.image_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Executor</label>
              <select
                value={editForm.executor_id ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, executor_id: Number(e.target.value) }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              >
                {executors.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name ?? `Executor #${ex.id}`} {ex.is_active ? '(active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Compute type</label>
              <input
                type="text"
                value={editForm.compute_type ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, compute_type: e.target.value }))}
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">vCPUs</label>
              <input
                type="number"
                value={editForm.vcpu_count ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, vcpu_count: Number(e.target.value) || undefined }))}
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ports (comma-separated)</label>
              <input
                type="text"
                value={editFormPorts}
                onChange={(e) => setEditFormPorts(e.target.value)}
                placeholder="8080, 8443"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Environment (KEY=VALUE, one per line)</label>
              <textarea
                value={editFormEnv}
                onChange={(e) => setEditFormEnv(e.target.value)}
                rows={4}
                placeholder="CUDA_VISIBLE_DEVICES=0"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={editSubmitting}
                className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
              >
                {editSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <section className={`rounded-xl bg-surface-700 border border-surface-500 p-6 ${editing ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-medium text-gray-200 mb-4">Pod details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-mono text-gray-200">{pod.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Compute type</dt>
            <dd className="font-mono text-gray-200">{pod.compute_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">vCPUs</dt>
            <dd className="font-mono text-gray-200">{pod.vcpu_count}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-300">{new Date(pod.created_at).toLocaleString()}</dd>
          </div>
          {pod.last_started_at && (
            <div>
              <dt className="text-gray-500">Last started</dt>
              <dd className="text-gray-300">{new Date(pod.last_started_at).toLocaleString()}</dd>
            </div>
          )}
          {pod.last_stopped_at && (
            <div>
              <dt className="text-gray-500">Last stopped</dt>
              <dd className="text-gray-300">{new Date(pod.last_stopped_at).toLocaleString()}</dd>
            </div>
          )}
          {pod.ports != null && pod.ports.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Ports</dt>
              <dd className="font-mono text-gray-200">{pod.ports.join(', ')}</dd>
            </div>
          )}
        </dl>
        {pod.env != null && Object.keys(pod.env).length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Environment</h3>
            <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">{envToLines(pod.env)}</pre>
          </div>
        )}
        {pod.template && (
          <div className="mt-4 pt-4 border-t border-surface-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Template</h3>
            <p className="font-mono text-sm text-gray-300">{pod.template.image_name}</p>
          </div>
        )}
      </section>
    </div>
  )
}
