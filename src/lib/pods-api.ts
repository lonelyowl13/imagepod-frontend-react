import { apiFetch } from './api'
import type { PodResponse, PodCreate, PodUpdate } from '@/types/api'

export async function listPods(token: string): Promise<PodResponse[]> {
  return apiFetch<PodResponse[]>('/pods/', { token })
}

export async function getPod(token: string, id: number): Promise<PodResponse> {
  return apiFetch<PodResponse>(`/pods/${id}`, { token })
}

export async function createPod(token: string, body: PodCreate): Promise<PodResponse> {
  return apiFetch<PodResponse>('/pods/', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function updatePod(
  token: string,
  id: number,
  body: PodUpdate
): Promise<PodResponse> {
  return apiFetch<PodResponse>(`/pods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  })
}

export async function deletePod(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/pods/${id}`, { method: 'DELETE', token })
}

export async function startPod(token: string, id: number): Promise<PodResponse> {
  return apiFetch<PodResponse>(`/pods/${id}/start`, { method: 'POST', token })
}

export async function stopPod(token: string, id: number): Promise<PodResponse> {
  return apiFetch<PodResponse>(`/pods/${id}/stop`, { method: 'POST', token })
}
