import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listVolumes, createVolume, deleteVolume } from '@/lib/volumes-api'
import { listExecutors } from '@/lib/executors-api'
import type { VolumeResponse, VolumeCreate, ExecutorSummary } from '@/types/api'
import { ApiError } from '@/lib/api'

export default function Volumes() {
  const { getAccessToken } = useAuth()
  const [volumes, setVolumes] = useState<VolumeResponse[]>([])
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', executor_id: '', size_gb: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    Promise.all([listVolumes(token), listExecutors(token)])
      .then(([v, e]) => {
        setVolumes(v)
        setExecutors(e)
      })
      .catch(() => setError('Failed to load volumes'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    const body: VolumeCreate = {
      name: form.name,
      executor_id: Number(form.executor_id),
      size_gb: form.size_gb ? Number(form.size_gb) : null,
    }
    try {
      await createVolume(token, body)
      setShowForm(false)
      setForm({ name: '', executor_id: '', size_gb: '' })
      load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create volume')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    const token = getAccessToken()
    if (!token || !confirm('Delete this volume? All mounts will be removed.')) return
    try {
      await deleteVolume(token, id)
      load()
    } catch {
      setError('Failed to delete volume')
    }
  }

  function executorName(executorId: number) {
    const ex = executors.find((e) => e.id === executorId)
    return ex?.name ?? `Executor #${executorId}`
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Volumes</h1>
          <p className="text-gray-400 text-sm mt-1">Persistent storage that can be mounted to endpoints</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
        >
          Create volume
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-xl bg-surface-700 border border-surface-500 p-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">New volume</h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. model-cache"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Executor</label>
              <select
                value={form.executor_id}
                onChange={(e) => setForm((f) => ({ ...f, executor_id: e.target.value }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              >
                <option value="">Select executor…</option>
                {executors.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name ?? `Executor #${ex.id}`} {ex.is_active ? '(active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Size (GB) <span className="text-gray-500 font-normal">— optional</span>
              </label>
              <input
                type="number"
                value={form.size_gb}
                onChange={(e) => setForm((f) => ({ ...f, size_gb: e.target.value }))}
                min={1}
                placeholder="e.g. 50"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create'}
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

      {volumes.length === 0 && !showForm ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No volumes. Create one to mount persistent storage to your endpoints.
        </div>
      ) : (
        <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
          {volumes.map((v) => (
            <li key={v.id} className="px-4 py-4 flex items-center justify-between">
              <Link to={`/volumes/${v.id}`} className="flex-1 min-w-0">
                <span className="font-medium text-gray-200 hover:text-accent">{v.name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {executorName(v.executor_id)}
                  {v.size_gb != null && ` · ${v.size_gb} GB`}
                </span>
              </Link>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleDelete(v.id) }}
                className="text-sm text-red-400 hover:text-red-300 ml-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
