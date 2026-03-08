import { apiFetch } from './api'
import type { EndpointResponse, EndpointCreate, EndpointUpdate } from '@/types/api'

export async function listEndpoints(token: string): Promise<EndpointResponse[]> {
  return apiFetch<EndpointResponse[]>('/endpoints/', { token })
}

export async function getEndpoint(token: string, id: number): Promise<EndpointResponse> {
  return apiFetch<EndpointResponse>(`/endpoints/${id}`, { token })
}

export async function createEndpoint(token: string, body: EndpointCreate): Promise<EndpointResponse> {
  return apiFetch<EndpointResponse>('/endpoints/', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function updateEndpoint(
  token: string,
  id: number,
  body: EndpointUpdate
): Promise<EndpointResponse> {
  return apiFetch<EndpointResponse>(`/endpoints/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  })
}

export async function deleteEndpoint(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/endpoints/${id}`, { method: 'DELETE', token })
}
