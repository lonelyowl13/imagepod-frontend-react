import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getVolume,
  updateVolume,
  deleteVolume,
  listMounts,
  mountVolume,
  unmountVolume,
} from '@/lib/volumes-api'
import { listEndpoints } from '@/lib/endpoints-api'
import type {
  VolumeResponse,
  VolumeUpdate,
  VolumeMountResponse,
  EndpointResponse,
} from '@/types/api'
import { ApiError } from '@/lib/api'

export default function VolumeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [volume, setVolume] = useState<VolumeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', size_gb: '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [mounts, setMounts] = useState<VolumeMountResponse[]>([])
  const [endpoints, setEndpoints] = useState<EndpointResponse[]>([])
  const [mountEndpointId, setMountEndpointId] = useState('')
  const [mountPath, setMountPath] = useState('/runpod-volume')
  const [mountSubmitting, setMountSubmitting] = useState(false)
  const [mountError, setMountError] = useState<string | null>(null)

  const volumeId = id ? parseInt(id, 10) : NaN

  const load = useCallback(() => {
    if (!id || !Number.isFinite(volumeId)) return
    const token = getAccessToken()
    if (!token) return
    getVolume(token, volumeId)
      .then((v) => {
        setVolume(v)
        setForm({ name: v.name, size_gb: v.size_gb != null ? String(v.size_gb) : '' })
      })
      .catch(() => setError('Failed to load volume'))
      .finally(() => setLoading(false))
  }, [id, volumeId, getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  const loadMounts = useCallback(() => {
    if (!volume) return
    const token = getAccessToken()
    if (!token) return
    listEndpoints(token)
      .then((eps) => {
        setEndpoints(eps.filter((ep) => ep.executor_id === volume.executor_id))
        const sameExecutorIds = eps
          .filter((ep) => ep.executor_id === volume.executor_id)
          .map((ep) => ep.id)
        return Promise.all(sameExecutorIds.map((epId) => listMounts(token, epId)))
      })
      .then((allMounts) => {
        if (!allMounts) return
        const flat = allMounts.flat().filter((m) => m.volume_id === volumeId)
        setMounts(flat)
      })
      .catch(() => {})
  }, [volume, volumeId, getAccessToken])

  useEffect(() => {
    loadMounts()
  }, [loadMounts])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!volume) return
    setFormError(null)
    setSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    const body: VolumeUpdate = {
      name: form.name || null,
      size_gb: form.size_gb ? Number(form.size_gb) : null,
    }
    try {
      const updated = await updateVolume(token, volume.id, body)
      setVolume(updated)
      setForm({ name: updated.name, size_gb: updated.size_gb != null ? String(updated.size_gb) : '' })
      setEditing(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update volume')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!volume || !confirm('Delete this volume? All mounts will be removed.')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deleteVolume(token, volume.id)
      navigate('/volumes')
    } catch {
      setError('Failed to delete volume')
    }
  }

  async function handleMount(e: React.FormEvent) {
    e.preventDefault()
    if (!volume) return
    setMountError(null)
    setMountSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    try {
      await mountVolume(token, Number(mountEndpointId), {
        volume_id: volume.id,
        mount_path: mountPath || '/runpod-volume',
      })
      setMountEndpointId('')
      setMountPath('/runpod-volume')
      loadMounts()
    } catch (err) {
      setMountError(err instanceof ApiError ? err.message : 'Failed to mount volume')
    } finally {
      setMountSubmitting(false)
    }
  }

  async function handleUnmount(endpointId: number) {
    if (!volume || !confirm('Unmount this volume from the endpoint?')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await unmountVolume(token, endpointId, volume.id)
      loadMounts()
    } catch {
      setMountError('Failed to unmount volume')
    }
  }

  const mountedEndpointIds = new Set(mounts.map((m) => m.endpoint_id))
  const availableEndpoints = endpoints.filter((ep) => !mountedEndpointIds.has(ep.id))

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error || !volume) return <p className="text-red-400">{error ?? 'Volume not found'}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">{volume.name}</h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            ID {volume.id} · Executor #{volume.executor_id}
            {volume.size_gb != null && ` · ${volume.size_gb} GB`}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
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
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-200 mb-4">Edit volume</h2>
          <form onSubmit={handleUpdate} className="space-y-4 max-w-lg">
            {formError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
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
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setForm({
                    name: volume.name,
                    size_gb: volume.size_gb != null ? String(volume.size_gb) : '',
                  })
                }}
                className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-xl bg-surface-700 border border-surface-500 p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-200 mb-4">Details</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Executor</dt>
              <dd className="font-mono text-gray-200">#{volume.executor_id}</dd>
            </div>
            {volume.size_gb != null && (
              <div>
                <dt className="text-gray-500">Size</dt>
                <dd className="font-mono text-gray-200">{volume.size_gb} GB</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-300">{new Date(volume.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      )}

      <section className="rounded-xl bg-surface-700 border border-surface-500 p-6">
        <h2 className="text-lg font-medium text-gray-200 mb-4">Mounts</h2>

        {mountError && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
            {mountError}
          </div>
        )}

        {mounts.length > 0 ? (
          <ul className="divide-y divide-surface-500 mb-6">
            {mounts.map((m) => {
              const ep = endpoints.find((e) => e.id === m.endpoint_id)
              return (
                <li key={m.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-gray-200 font-medium">
                      {ep?.name ?? `Endpoint #${m.endpoint_id}`}
                    </span>
                    <span className="text-gray-500 text-sm ml-2 font-mono">{m.mount_path}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnmount(m.endpoint_id)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Unmount
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm mb-6">Not mounted to any endpoints.</p>
        )}

        {availableEndpoints.length > 0 ? (
          <div className="border-t border-surface-500 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Mount to endpoint</h3>
            <form onSubmit={handleMount} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs text-gray-500 mb-1">Endpoint</label>
                <select
                  value={mountEndpointId}
                  onChange={(e) => setMountEndpointId(e.target.value)}
                  required
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-gray-200"
                >
                  <option value="">Select…</option>
                  {availableEndpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
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
        ) : endpoints.length > 0 ? (
          <p className="text-gray-500 text-sm border-t border-surface-500 pt-4">
            All endpoints on this executor already have this volume mounted.
          </p>
        ) : (
          <p className="text-gray-500 text-sm border-t border-surface-500 pt-4">
            No endpoints on executor #{volume.executor_id}. Create one first.
          </p>
        )}
      </section>
    </div>
  )
}
