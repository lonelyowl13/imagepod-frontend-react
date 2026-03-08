import { apiFetch } from './api'
import type {
  LoginRequest,
  RegisterRequest,
  Token,
  UserResponse,
  KeyList,
  ApiKey,
  ChangePasswordRequest,
} from '@/types/api'

export async function register(body: RegisterRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function login(body: LoginRequest): Promise<Token> {
  return apiFetch<Token>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function refresh(refreshToken: string): Promise<Token> {
  return apiFetch<Token>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export async function changePassword(
  token: string,
  body: ChangePasswordRequest
): Promise<void> {
  return apiFetch<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function listApiKeys(token: string): Promise<KeyList> {
  return apiFetch<KeyList>('/auth/keys', { token })
}

export async function createApiKey(token: string): Promise<ApiKey> {
  return apiFetch<ApiKey>('/auth/key', { method: 'POST', token })
}

export async function deleteApiKey(token: string, keyId: number): Promise<void> {
  return apiFetch<void>(`/auth/key/${keyId}`, { method: 'DELETE', token })
}
