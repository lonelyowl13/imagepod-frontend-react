import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listApiKeys, createApiKey, deleteApiKey } from '@/lib/auth-api'
import type { ApiKeyMetadata } from '@/types/api'
import { ApiError } from '@/lib/api'

export default function ApiKeys() {
  const { getAccessToken } = useAuth()
  const [keys, setKeys] = useState<ApiKeyMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    const token = getAccessToken()
    if (!token) return
    listApiKeys(token)
      .then((r) => setKeys(r.keys))
      .catch(() => setError('Failed to load API keys'))
      .finally(() => setLoading(false))
  }, [getAccessToken])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    const token = getAccessToken()
    if (!token) return
    setCreating(true)
    setError(null)
    setNewKey(null)
    try {
      const result = await createApiKey(token)
      setNewKey(result.api_key)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: number) {
    const token = getAccessToken()
    if (!token || !confirm('Revoke this API key? It will stop working immediately.')) return
    try {
      await deleteApiKey(token, id)
      load()
    } catch {
      setError('Failed to delete key')
    }
  }

  function copyKey(k: string) {
    navigator.clipboard.writeText(k)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) return <p className="text-gray-400">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">API Keys</h1>
          <p className="text-gray-400 text-sm mt-1">Use these for programmatic access to run jobs</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
          {error}
        </div>
      )}

      {newKey && (
        <div className="mb-6 rounded-xl bg-accent-muted border border-accent/30 p-4">
          <p className="text-sm text-gray-300 mb-2">New API key. Copy it now — it won’t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-surface-800 px-3 py-2 text-sm font-mono text-accent break-all">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => copyKey(newKey)}
              className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-3 py-2 text-sm"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {keys.length === 0 && !newKey ? (
        <div className="rounded-xl bg-surface-700 border border-surface-500 border-dashed p-12 text-center text-gray-500">
          No API keys. Create one to call the API from scripts or apps.
        </div>
      ) : (
        <ul className="rounded-xl bg-surface-700 border border-surface-500 divide-y divide-surface-500">
          {keys.map((k) => (
            <li key={k.id} className="px-4 py-4 flex items-center justify-between">
              <div className="font-mono text-sm text-gray-400">
                Key #{k.id} · Created {new Date(k.created_at).toLocaleString()}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(k.id)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
