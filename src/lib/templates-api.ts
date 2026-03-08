import { apiFetch } from './api'
import type { TemplateResponse, TemplateCreate, TemplateUpdate } from '@/types/api'

export async function listTemplates(token: string): Promise<TemplateResponse[]> {
  return apiFetch<TemplateResponse[]>('/templates/', { token })
}

export async function getTemplate(token: string, id: number): Promise<TemplateResponse> {
  return apiFetch<TemplateResponse>(`/templates/${id}`, { token })
}

export async function createTemplate(
  token: string,
  body: TemplateCreate
): Promise<TemplateResponse> {
  return apiFetch<TemplateResponse>('/templates/', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function updateTemplate(
  token: string,
  id: number,
  body: TemplateUpdate
): Promise<TemplateResponse> {
  return apiFetch<TemplateResponse>(`/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  })
}

export async function deleteTemplate(token: string, id: number): Promise<void> {
  return apiFetch<void>(`/templates/${id}`, { method: 'DELETE', token })
}
