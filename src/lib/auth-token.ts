/**
 * Token provider for the API layer: get current token and refresh on 401.
 * Set by AuthProvider so apiFetch can refresh and retry without circular deps.
 */
let refreshAndGetToken: (() => Promise<string | null>) | null = null

export function setRefreshAndGetToken(fn: (() => Promise<string | null>) | null) {
  refreshAndGetToken = fn
}

export function getRefreshAndGetToken(): (() => Promise<string | null>) | null {
  return refreshAndGetToken
}
