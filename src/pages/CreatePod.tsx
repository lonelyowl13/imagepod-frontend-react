import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { createPod } from '@/lib/pods-api'
import { listTemplates } from '@/lib/templates-api'
import { listExecutors } from '@/lib/executors-api'
import type { TemplateResponse, ExecutorSummary } from '@/types/api'
import { ApiError } from '@/lib/api'
import { linesToEnv } from '@/lib/format'

function parsePorts(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

export default function CreatePod() {
  const { getAccessToken } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateResponse[]>([])
  const [executors, setExecutors] = useState<ExecutorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [executorId, setExecutorId] = useState<number | null>(null)
  const [computeType, setComputeType] = useState('GPU')
  const [vcpuCount, setVcpuCount] = useState(2)
  const [portsInput, setPortsInput] = useState('')
  const [envInput, setEnvInput] = useState('')
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

  const podTemplates = templates.filter((t) => t.is_serverless === false)

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
      const ports = parsePorts(portsInput)
      const env = linesToEnv(envInput)
      const pod = await createPod(token, {
        name,
        template_id: templateId,
        executor_id: executorId,
        compute_type: computeType || undefined,
        vcpu_count: vcpuCount,
        ...(ports.length > 0 && { ports }),
        ...(Object.keys(env).length > 0 && { env }),
      })
      navigate(`/pods/${pod.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create pod')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-100 mb-2">Create pod</h1>
      <p className="text-gray-400 text-sm mb-6">Choose a template and executor for your long-lived pod.</p>

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
            {podTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.image_name})
              </option>
            ))}
          </select>
          {podTemplates.length === 0 && (
            <p className="text-gray-500 text-xs mt-1">
              No pod templates. Create a template with &quot;Serverless&quot; unchecked for use with pods.
            </p>
          )}
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Compute type</label>
            <input
              type="text"
              value={computeType}
              onChange={(e) => setComputeType(e.target.value)}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">vCPUs</label>
            <input
              type="number"
              value={vcpuCount}
              onChange={(e) => setVcpuCount(Number(e.target.value) || 2)}
              min={1}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Ports (comma-separated)</label>
          <input
            type="text"
            value={portsInput}
            onChange={(e) => setPortsInput(e.target.value)}
            placeholder="8080, 8443"
            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 text-gray-200 placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Environment (KEY=VALUE, one per line)</label>
          <textarea
            value={envInput}
            onChange={(e) => setEnvInput(e.target.value)}
            rows={4}
            placeholder="CUDA_VISIBLE_DEVICES=0"
            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2 font-mono text-sm text-gray-200 placeholder-gray-500"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting || !name || !templateId || !executorId || podTemplates.length === 0}
            className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create pod'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/pods')}
            className="rounded-lg bg-surface-600 text-gray-300 px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
