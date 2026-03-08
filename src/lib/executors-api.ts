import { apiFetch } from './api'
import type {
  ExecutorSummary,
  ExecutorAddRequest,
  ExecutorAddResponse,
  ExecutorShareResponse,
} from '@/types/api'

export async function listExecutors(token: string): Promise<ExecutorSummary[]> {
  return apiFetch<ExecutorSummary[]>('/executors/', { token })
}

export async function addExecutor(
  token: string,
  body: ExecutorAddRequest
): Promise<ExecutorAddResponse> {
  return apiFetch<ExecutorAddResponse>('/executors/add', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function shareExecutor(
  token: string,
  executorId: number,
  username: string
): Promise<ExecutorShareResponse> {
  return apiFetch<ExecutorShareResponse>(`/executors/${executorId}/share`, {
    method: 'POST',
    body: JSON.stringify({ username }),
    token,
  })
}

export async function unshareExecutor(
  token: string,
  executorId: number,
  username: string
): Promise<void> {
  return apiFetch<void>(`/executors/${executorId}/share/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    token,
  })
}

export async function listExecutorShares(
  token: string,
  executorId: number
): Promise<ExecutorShareResponse[]> {
  return apiFetch<ExecutorShareResponse[]>(`/executors/${executorId}/shares`, {
    token,
  })
}

export async function deleteExecutor(
  token: string,
  executorId: number
): Promise<void> {
  return apiFetch<void>(`/executors/${executorId}`, {
    method: 'DELETE',
    token,
  })
}
