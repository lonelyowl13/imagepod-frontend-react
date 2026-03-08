import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { changePassword } from '@/lib/auth-api'
import { ApiError } from '@/lib/api'

export default function Settings() {
  const { getAccessToken } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (newPassword !== newPassword2) {
      setError('New passwords do not match')
      return
    }
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      await changePassword(token, {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: newPassword2,
      })
      setSuccess(true)
      setOldPassword('')
      setNewPassword('')
      setNewPassword2('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-100">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Account and security settings</p>
      </div>

      <div className="rounded-xl bg-surface-700 border border-surface-500 p-6 max-w-md">
        <h2 className="text-lg font-medium text-gray-200 mb-4">Change password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3">
              Password changed successfully.
            </div>
          )}
          <div>
            <label htmlFor="old_password" className="block text-sm font-medium text-gray-300 mb-1">
              Current password
            </label>
            <input
              id="old_password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-300 mb-1">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label htmlFor="new_password2" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm new password
            </label>
            <input
              id="new_password2"
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-4 py-2.5 text-gray-200 placeholder-gray-500 focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent hover:bg-accent-hover text-surface-800 font-medium px-4 py-2 disabled:opacity-50"
          >
            {loading ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}
