import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getTemplate, updateTemplate, deleteTemplate } from '@/lib/templates-api'
import type { TemplateResponse, TemplateUpdate } from '@/types/api'
import { ApiError } from '@/lib/api'
import { stringsToLines, linesToStrings, envToLines, linesToEnv } from '@/lib/format'

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getAccessToken } = useAuth()
  const [template, setTemplate] = useState<TemplateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    image_name: '',
    docker_entrypoint: '',
    docker_start_cmd: '',
    env: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const templateId = id ? parseInt(id, 10) : NaN

  const load = useCallback(() => {
    if (!id || !Number.isFinite(templateId)) return
    const token = getAccessToken()
    if (!token) return
    getTemplate(token, templateId)
      .then((t) => {
        setTemplate(t)
        setForm({
          name: t.name,
          image_name: t.image_name,
          docker_entrypoint: stringsToLines(t.docker_entrypoint),
          docker_start_cmd: stringsToLines(t.docker_start_cmd),
          env: envToLines(t.env),
        })
      })
      .catch(() => setError('Failed to load template'))
      .finally(() => setLoading(false))
  }, [id, templateId, getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!template) return
    setFormError(null)
    setSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    const body: TemplateUpdate = {
      name: form.name || null,
      image_name: form.image_name || null,
      docker_entrypoint: linesToStrings(form.docker_entrypoint).length
        ? linesToStrings(form.docker_entrypoint)
        : null,
      docker_start_cmd: linesToStrings(form.docker_start_cmd).length
        ? linesToStrings(form.docker_start_cmd)
        : null,
      env: Object.keys(linesToEnv(form.env)).length ? linesToEnv(form.env) : null,
    }
    try {
      const updated = await updateTemplate(token, template.id, body)
      setTemplate(updated)
      setForm({
        name: updated.name,
        image_name: updated.image_name,
        docker_entrypoint: stringsToLines(updated.docker_entrypoint),
        docker_start_cmd: stringsToLines(updated.docker_start_cmd),
        env: envToLines(updated.env),
      })
      setEditing(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to update template')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!template || !confirm('Delete this template? Endpoints using it may break.')) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deleteTemplate(token, template.id)
      navigate('/templates')
    } catch {
      setError('Failed to delete template')
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>
  if (error || !template) return <p className="text-red-400">{error ?? 'Template not found'}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">{template.name}</h1>
          <p className="text-gray-400 text-sm mt-1 font-mono">{template.image_name}</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2"
            >
              Edit
            </button>
          ) : null}
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
          <h2 className="text-lg font-medium text-gray-200 mb-4">Edit template</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Docker image</label>
              <input
                type="text"
                value={form.image_name}
                onChange={(e) => setForm((f) => ({ ...f, image_name: e.target.value }))}
                required
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Docker entrypoint (one per line)
              </label>
              <textarea
                value={form.docker_entrypoint}
                onChange={(e) => setForm((f) => ({ ...f, docker_entrypoint: e.target.value }))}
                rows={3}
                placeholder="/bin/sh"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Docker start command (one per line)
              </label>
              <textarea
                value={form.docker_start_cmd}
                onChange={(e) => setForm((f) => ({ ...f, docker_start_cmd: e.target.value }))}
                rows={3}
                placeholder="-c\nsleep infinity"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Environment (KEY=VALUE, one per line)
              </label>
              <textarea
                value={form.env}
                onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}
                rows={4}
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
                {submitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setForm({
                    name: template.name,
                    image_name: template.image_name,
                    docker_entrypoint: stringsToLines(template.docker_entrypoint),
                    docker_start_cmd: stringsToLines(template.docker_start_cmd),
                    env: envToLines(template.env),
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
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Image</dt>
              <dd className="font-mono text-gray-200">{template.image_name}</dd>
            </div>
            {template.docker_entrypoint?.length ? (
              <div>
                <dt className="text-gray-500">Entrypoint</dt>
                <dd className="font-mono text-gray-200 text-xs">
                  {template.docker_entrypoint.join(' ')}
                </dd>
              </div>
            ) : null}
            {template.docker_start_cmd?.length ? (
              <div>
                <dt className="text-gray-500">Start command</dt>
                <dd className="font-mono text-gray-200 text-xs">
                  {template.docker_start_cmd.join(' ')}
                </dd>
              </div>
            ) : null}
            {template.env && Object.keys(template.env).length > 0 ? (
              <div>
                <dt className="text-gray-500">Environment</dt>
                <dd className="font-mono text-gray-200 text-xs">
                  <pre className="whitespace-pre-wrap">{envToLines(template.env)}</pre>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
    </div>
  )
}
