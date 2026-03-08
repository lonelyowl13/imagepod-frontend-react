import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { listTemplates, createTemplate, deleteTemplate } from '@/lib/templates-api'
import type { TemplateResponse, TemplateCreate } from '@/types/api'
import { ApiError } from '@/lib/api'
import { linesToStrings, linesToEnv } from '@/lib/format'

export default function Templates() {
  const { getAccessToken } = useAuth()
  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    image_name: '',
    docker_entrypoint: '',
    docker_start_cmd: '',
    env: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    listTemplates(token)
      .then(setTemplates)
      .catch(() => setError('Failed to load templates'))
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
    const body: TemplateCreate = {
      name: form.name,
      image_name: form.image_name,
      docker_entrypoint: linesToStrings(form.docker_entrypoint).length
        ? linesToStrings(form.docker_entrypoint)
        : null,
      docker_start_cmd: linesToStrings(form.docker_start_cmd).length
        ? linesToStrings(form.docker_start_cmd)
        : null,
      env: Object.keys(linesToEnv(form.env)).length ? linesToEnv(form.env) : null,
    }
    try {
      await createTemplate(token, body)
      setShowForm(false)
      setForm({ name: '', image_name: '', docker_entrypoint: '', docker_start_cmd: '', env: '' })
      load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create template')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    const token = getAccessToken()
    if (!token || !confirm('Delete this template?')) return
    try {
      await deleteTemplate(token, id)
      load()
    } catch {
      setError('Failed to delete template')
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Templates</h1>
          <p className="text-gray-400 text-sm mt-1">Docker-based templates for your endpoints</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
        >
          Create template
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-8 rounded-xl bg-surface-700 border border-surface-500 p-6">
          <h2 className="text-lg font-medium text-gray-200 mb-4">New template</h2>
          <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Docker image</label>
              <input
                type="text"
                value={form.image_name}
                onChange={(e) => setForm((f) => ({ ...f, image_name: e.target.value }))}
                required
                placeholder="e.g. nvidia/cuda:12.0-runtime"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Docker entrypoint (one per line)</label>
              <textarea
                value={form.docker_entrypoint}
                onChange={(e) => setForm((f) => ({ ...f, docker_entrypoint: e.target.value }))}
                rows={2}
                placeholder="/bin/sh"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Docker start command (one per line)</label>
              <textarea
                value={form.docker_start_cmd}
                onChange={(e) => setForm((f) => ({ ...f, docker_start_cmd: e.target.value }))}
                rows={2}
                placeholder="-c\nsleep infinity"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Environment (KEY=VALUE, one per line)</label>
              <textarea
                value={form.env}
                onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}
                rows={3}
                placeholder="CUDA_VISIBLE_DEVICES=0"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
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

      {templates.length === 0 && !showForm ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No templates. Create one to use with endpoints.
        </div>
      ) : (
        <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
          {templates.map((t) => (
            <li key={t.id} className="px-4 py-4 flex items-center justify-between">
              <Link to={`/templates/${t.id}`} className="flex-1 min-w-0">
                <span className="font-medium text-gray-200 hover:text-accent">{t.name}</span>
                <span className="text-gray-500 text-sm ml-2 font-mono">{t.image_name}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleDelete(t.id); }}
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
