import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { createEndpoint } from '@/lib/endpoints-api'
import { listTemplates } from '@/lib/templates-api'
import { listExecutors } from '@/lib/executors-api'
import type { TemplateResponse, ExecutorSummary } from '@/types/api'
import { ApiError } from '@/lib/api'

export default function CreateEndpoint() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [executorId, setExecutorId] = useState<number | null>(null)
  const [executionTimeoutMs, setExecutionTimeoutMs] = useState(600_000)
  const [idleTimeout, setIdleTimeout] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  const loadOptions = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    Promise.all([listTemplates(token), listExecutors(token)])
      .then(([t, e]) => {
        setTemplates(t)
        setExecutors(e)
      })
      .catch(() => setError('Failed to load templates or executors'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!templateId || !executorId) {
      setError('Please select a template and an executor')
      return
    }
    setError(null)
    setSubmitting(true)
    const token = getAccessToken()
    if (!token) return
    try {
      const ep = await createEndpoint(token, {
        name,
        template_id: templateId,
        executor_id: executorId,
        compute_type: 'GPU',
        execution_timeout_ms: executionTimeoutMs,
        idle_timeout: idleTimeout,
        vcpu_count: 2,
      })
      navigate(`/endpoints/${ep.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create endpoint')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">Create endpoint</h1>
      <p className="text-gray-400 text-sm mb-6">Choose a template and executor for your serverless endpoint.</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Template</label>
          <select
            value={templateId ?? ''}
            onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
            required
            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
          >
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.image_name})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Executor</label>
          <select
            value={executorId ?? ''}
            onChange={(e) => setExecutorId(e.target.value ? Number(e.target.value) : null)}
            required
            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
          >
            <option value="">Select executor</option>
            {executors.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name ?? `Executor #${ex.id}`} {ex.is_active ? '(active)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Execution timeout (ms)</label>
            <input
              type="number"
              value={executionTimeoutMs}
              onChange={(e) => setExecutionTimeoutMs(Number(e.target.value))}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Idle timeout (s)</label>
            <input
              type="number"
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(Number(e.target.value))}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting || !name || !templateId || !executorId}
            className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create endpoint'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/endpoints')}
            className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
