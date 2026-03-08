import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { login as loginApi, refresh } from '@/lib/auth-api'
import { setRefreshAndGetToken } from '@/lib/auth-token'
import type { LoginRequest, Token } from '@/types/api'

const ACCESS_KEY = 'imagepod_access_token'
const REFRESH_KEY = 'imagepod_refresh_token'
const REFRESH_BEFORE_EXP_SEC = 60
const FALLBACK_REFRESH_MS = 50 * 60 * 1000 // 50 min when we can't read exp

function getStoredAccess(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

function getStoredRefresh(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

function setStoredTokens(access: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

function clearStoredTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Decode JWT payload and return exp (seconds since epoch) or null */
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; accessToken: string }

type AuthContextValue = {
  state: AuthState
  login: (body: LoginRequest) => Promise<void>
  logout: () => void
  getAccessToken: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleRefreshRef = useRef<(accessToken: string) => void>()

  const tryRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = getStoredRefresh()
    if (!refreshToken) {
      setState({ status: 'unauthenticated' })
      return null
    }
    try {
      const data: Token = await refresh(refreshToken)
      setStoredTokens(data.access_token, data.refresh_token)
      setState({ status: 'authenticated', accessToken: data.access_token })
      return data.access_token
    } catch {
      clearStoredTokens()
      setState({ status: 'unauthenticated' })
      return null
    }
  }, [])

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    const exp = getJwtExp(accessToken)
    const ms =
      exp != null
        ? Math.max(1000, (exp - REFRESH_BEFORE_EXP_SEC) * 1000 - Date.now())
        : FALLBACK_REFRESH_MS
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null
      tryRefresh().then((newToken) => {
        if (newToken) scheduleRefreshRef.current?.(newToken)
      })
    }, ms)
  }, [tryRefresh])

  scheduleRefreshRef.current = scheduleRefresh

  useEffect(() => {
    setRefreshAndGetToken(() => tryRefresh())
    return () => setRefreshAndGetToken(null)
  }, [tryRefresh])

  useEffect(() => {
    const access = getStoredAccess()
    if (access) {
      setState({ status: 'authenticated', accessToken: access })
      scheduleRefresh(access)
      return
    }
    tryRefresh().then((t) => t && scheduleRefresh(t))
  }, [tryRefresh, scheduleRefresh])

  const login = useCallback(async (body: LoginRequest) => {
    const data = await loginApi(body)
    setStoredTokens(data.access_token, data.refresh_token)
    setState({ status: 'authenticated', accessToken: data.access_token })
    scheduleRefresh(data.access_token)
  }, [scheduleRefresh])

  const logout = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
    clearStoredTokens()
    setState({ status: 'unauthenticated' })
  }, [])

  const getAccessToken = useCallback(() => {
    return state.status === 'authenticated' ? state.accessToken : null
  }, [state])

  const value = useMemo<AuthContextValue>(
    () => ({ state, login, logout, getAccessToken }),
    [state, login, logout, getAccessToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
