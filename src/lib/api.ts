import { getRefreshAndGetToken } from './auth-token'

/**
 * API base URL: set VITE_API_URL in .env (see .env.example). If unset in dev, /api is proxied to localhost:8000.
 */
const getBaseUrl = () => {
  const env = import.meta.env.VITE_API_URL
  if (env) return env.replace(/\/$/, '')
  return '/api'
}

export const apiBase = getBaseUrl()

async function doFetch(
  url: string,
  init: RequestInit,
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (init.headers) {
    Object.assign(headers, init.headers)
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { ...init, headers })
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
  let res = await doFetch(url, init, token ?? null)
  if (res.status === 401) {
    const refresh = getRefreshAndGetToken()
    if (refresh) {
      const newToken = await refresh()
      if (newToken) {
        res = await doFetch(url, init, newToken)
      }
    }
  }
  if (!res.ok) {
    const text = await res.text()
    let detail: unknown = text
    try {
      detail = JSON.parse(text)
    } catch {
      // use text as message
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown
  ) {
    const msg = typeof detail === 'object' && detail !== null && 'detail' in detail
      ? JSON.stringify((detail as { detail: unknown }).detail)
      : typeof detail === 'string'
        ? detail
        : 'Request failed'
    super(msg)
    this.name = 'ApiError'
  }
}
