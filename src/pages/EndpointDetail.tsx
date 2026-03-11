import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getEndpoint, deleteEndpoint, updateEndpoint } from '@/lib/endpoints-api'
import { listTemplates } from '@/lib/templates-api'
import { listExecutors } from '@/lib/executors-api'
import { runJob, getJobStatus, cancelJob } from '@/lib/jobs-api'
import type {
  EndpointResponse,
  EndpointUpdate,
  JobResponse,
  TemplateResponse,
  ExecutorSummary,
} from '@/types/api'
import { listMounts, mountVolume, unmountVolume, listVolumes } from '@/lib/volumes-api'
import type { VolumeMountResponse, VolumeResponse } from '@/types/api'
import { ApiError } from '@/lib/api'
import { envToLines, linesToEnv } from '@/lib/format'

export default function EndpointDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [endpoint, setEndpoint] = useState<EndpointResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [jobInput, setJobInput] = useState('{"prompt": "hello"}')
  const [runningJob, setRunningJob] = useState<JobResponse | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [editForm, setEditForm] = useState<EndpointUpdate>({})
  const [editFormEnv, setEditFormEnv] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [mounts, setMounts] = useState<VolumeMountResponse[]>([])
  const [availableVolumes, setAvailableVolumes] = useState<VolumeResponse[]>([])
  const [mountVolumeId, setMountVolumeId] = useState('')
  const [mountPath, setMountPath] = useState('/runpod-volume')
  const [mountSubmitting, setMountSubmitting] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)

  const endpointId = id ? parseInt(id, 10) : NaN

  const loadEndpoint = useCallback(() => {
    if (!id || !Number.isFinite(endpointId)) return
    const token = getAccessToken()
    if (!token) return
    getEndpoint(token, endpointId)
      .then(setEndpoint)
      .catch(() => setError('Failed to load endpoint'))
      .finally(() => setLoading(false))
  }, [id, endpointId, getAccessToken])

  useEffect(() => {
    loadEndpoint()
  }, [loadEndpoint])

  const loadMounts = useCallback(() => {
    if (!endpoint) return
    const token = getAccessToken()
    if (!token) return
    Promise.all([listMounts(token, endpoint.id), listVolumes(token)])
      .then(([m, allVols]) => {
        setMounts(m)
        const mountedIds = new Set(m.map((mt) => mt.volume_id))
        setAvailableVolumes(
          allVols.filter(
            (v) => v.executor_id === endpoint.executor_id && !mountedIds.has(v.id)
          )
        )
      })
      .catch(() => {})
  }, [endpoint, getAccessToken])

  useEffect(() => {
    loadMounts()
  }, [loadMounts])

  async function handleMountVolume(e: React.FormEvent) {
    e.preventDefault()
    if (!endpoint) return
    setMountError(null)
    setMountSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    try {
      await mountVolume(token, endpoint.id, {
        volume_id: Number(mountVolumeId),
        mount_path: mountPath || '/runpod-volume',
      })
      setMountVolumeId('')
      setMountPath('/runpod-volume')
      loadMounts()
    } catch (err) {
      setMountError(err instanceof ApiError ? err.message : 'Failed to mount volume')
    } finally {
      setMountSubmitting(false)
    }
  }

  async function handleUnmountVolume(volumeId: number) {
    if (!endpoint || !confirm('Unmount this volume?')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await unmountVolume(token, endpoint.id, volumeId)
      loadMounts()
    } catch {
      setMountError('Failed to unmount volume')
    }
  }

  useEffect(() => {
    if (!runningJob || !endpoint) return
    const token = getAccessToken()
    if (!token) return
    const statuses = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])
    if (statuses.has(runningJob.status)) {
      setPolling(false)
      return
    }
    setPolling(true)
    const t = setInterval(() => {
      getJobStatus(token, endpoint.id, runningJob.id)
        .then((job) => {
          setRunningJob(job)
          if (statuses.has(job.status)) {
            setPolling(false)
          }
        })
        .catch(() => setPolling(false))
    }, 2000)
    return () => clearInterval(t)
  }, [runningJob?.id, runningJob?.status, endpoint?.id, getAccessToken])

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    setJobError(null)
    let input: Record<string, unknown>
    try {
      input = JSON.parse(jobInput) as Record<string, unknown>
    } catch {
      setJobError('Invalid JSON')
      return
    }
    const token = getAccessToken()
    if (!token || !endpoint) return
    try {
      const res = await runJob(token, endpoint.id, { input })
      setRunningJob({
        id: res.id,
        status: res.status,
        delay_time: 0,
        execution_time: 0,
        input,
        endpoint_id: endpoint.id,
        executor_id: endpoint.executor_id,
        output: null,
      })
    } catch (err) {
      setJobError(err instanceof ApiError ? err.message : 'Failed to run job')
    }
  }

  async function handleCancel() {
    if (!runningJob || !endpoint) return
    const token = getAccessToken()
    if (!token) return
    try {
      const job = await cancelJob(token, endpoint.id, runningJob.id)
      setRunningJob(job)
    } catch {
      setJobError('Failed to cancel job')
    }
  }

  async function handleDelete() {
    if (!endpoint || !confirm('Delete this endpoint? This cannot be undone.')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deleteEndpoint(token, endpoint.id)
      navigate('/endpoints')
    } catch {
      setError('Failed to delete endpoint')
    }
  }

  const serverlessTemplates = templates.filter((t) => t.is_serverless !== false)

  useEffect(() => {
    if (!editing || !getAccessToken()) return
    Promise.all([listTemplates(getAccessToken()!), listExecutors(getAccessToken()!)])
      .then(([t, e]) => {
        setTemplates(t)
        setExecutors(e)
      })
      .catch(() => {})
  }, [editing, getAccessToken])

  function startEditing() {
    if (!endpoint) return
    setEditForm({
      name: endpoint.name,
      template_id: endpoint.template_id,
      executor_id: endpoint.executor_id,
      compute_type: endpoint.compute_type,
      execution_timeout_ms: endpoint.execution_timeout_ms,
      idle_timeout: endpoint.idle_timeout,
      vcpu_count: endpoint.vcpu_count,
    })
    setEditFormEnv(envToLines(endpoint.env ?? {}))
    setEditError(null)
    setEditing(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!endpoint) return
    setEditError(null)
    setEditSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    const env = linesToEnv(editFormEnv)
    const body = Object.keys(env).length ? { ...editForm, env } : editForm
    try {
      const updated = await updateEndpoint(token, endpoint.id, body)
      setEndpoint(updated)
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update endpoint')
    } finally {
      setEditSubmitting(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error || !endpoint) return <p className="text-red-400">{error ?? 'Endpoint not found'}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">{endpoint.name}</h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            ID {endpoint.id} · Template: {endpoint.template?.name ?? 'Unknown template'} · Executor: {endpoint.executor_id}
          </p>
        </div>
        <div className="flex gap-2">
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
            Delete endpoint
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-xl bg-surface-700 border border-surface-500 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-200 mb-4">Edit endpoint</h2>
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
                {serverlessTemplates.map((t) => (
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Execution timeout (ms)</label>
                <input
                  type="number"
                  value={editForm.execution_timeout_ms ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, execution_timeout_ms: Number(e.target.value) || undefined }))}
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Idle timeout (s)</label>
                <input
                  type="number"
                  value={editForm.idle_timeout ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, idle_timeout: Number(e.target.value) || undefined }))}
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
                />
              </div>
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

      <section className="rounded-xl bg-surface-700 border border-surface-500 p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-200 mb-4">Run a job</h2>
        <form onSubmit={handleRun} className="space-y-4">
          {jobError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
              {jobError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Input (JSON)</label>
            <textarea
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
              rows={6}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              placeholder='{"prompt": "hello"}'
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!!runningJob && polling}
              className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
            >
              {runningJob && polling ? 'Running…' : 'Run job'}
            </button>
            {runningJob && !['COMPLETED', 'FAILED', 'CANCELLED'].includes(runningJob.status) && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
              >
                Cancel job
              </button>
            )}
          </div>
        </form>

        {runningJob && (
          <div className="mt-6 pt-6 border-t border-surface-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Job #{runningJob.id}</h3>
            <p className="text-sm text-gray-300">
              Status: <span className="font-mono text-accent">{runningJob.status}</span>
              {runningJob.execution_time > 0 && (
                <span className="ml-2 text-gray-500">Execution time: {runningJob.execution_time}ms</span>
              )}
            </p>
            {runningJob.stream != null && runningJob.stream.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Stream ({runningJob.stream.length} chunk{runningJob.stream.length === 1 ? '' : 's'})</h4>
                <pre className="rounded bg-surface-800 p-4 text-sm font-mono text-gray-300 overflow-auto max-h-48">
                  {runningJob.stream.map((chunk) =>
                    typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
                  ).join('\n')}
                </pre>
              </div>
            )}
            {runningJob.output != null && (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Output</h4>
                <pre className="rounded bg-surface-800 p-4 text-sm font-mono text-gray-300 overflow-auto max-h-48">
                  {JSON.stringify(runningJob.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      <section className={`rounded-xl bg-surface-700 border border-surface-500 p-6 ${editing ? 'opacity-60 pointer-events-none' : ''}`}>
        <h2 className="text-lg font-medium text-gray-200 mb-4">Endpoint details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-mono text-gray-200">{endpoint.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Compute type</dt>
            <dd className="font-mono text-gray-200">{endpoint.compute_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Execution timeout</dt>
            <dd className="font-mono text-gray-200">{endpoint.execution_timeout_ms} ms</dd>
          </div>
          <div>
            <dt className="text-gray-500">Idle timeout</dt>
            <dd className="font-mono text-gray-200">{endpoint.idle_timeout} s</dd>
          </div>
          <div>
            <dt className="text-gray-500">vCPUs</dt>
            <dd className="font-mono text-gray-200">{endpoint.vcpu_count}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="text-gray-300">{new Date(endpoint.created_at).toLocaleString()}</dd>
          </div>
        </dl>
        {endpoint.env != null && Object.keys(endpoint.env).length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Environment</h3>
            <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">{envToLines(endpoint.env)}</pre>
          </div>
        )}
        {endpoint.template && (
          <div className="mt-4 pt-4 border-t border-surface-500">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Template</h3>
            <p className="font-mono text-sm text-gray-300">{endpoint.template.image_name}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-surface-700 border border-surface-500 p-6 mt-8">
        <h2 className="text-lg font-medium text-gray-200 mb-4">Volumes</h2>

        {mountError && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
            {mountError}
          </div>
        )}

        {mounts.length > 0 ? (
          <ul className="divide-y divide-surface-500 mb-6">
            {mounts.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="text-gray-200 font-medium">{m.volume.name}</span>
                  <span className="text-gray-500 text-sm ml-2 font-mono">{m.mount_path}</span>
                  {m.volume.size_gb != null && (
                    <span className="text-gray-500 text-sm ml-2">{m.volume.size_gb} GB</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnmountVolume(m.volume_id)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Unmount
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm mb-6">No volumes mounted.</p>
        )}

        {availableVolumes.length > 0 && (
          <div className="border-t border-surface-500 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Mount a volume</h3>
            <form onSubmit={handleMountVolume} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-500 mb-1">Volume</label>
                <select
                  value={mountVolumeId}
                  onChange={(e) => setMountVolumeId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-gray-200"
                >
                  <option value="">Select…</option>
                  {availableVolumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.size_gb != null ? ` (${v.size_gb} GB)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="block text-xs text-gray-500 mb-1">Mount path</label>
                <input
                  type="text"
                  value={mountPath}
                  onChange={(e) => setMountPath(e.target.value)}
                  placeholder="/runpod-volume"
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-500"
                />
              </div>
              <button
                type="submit"
                disabled={mountSubmitting}
                className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 text-sm disabled:opacity-50"
              >
                {mountSubmitting ? 'Mounting…' : 'Mount'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  )
}
