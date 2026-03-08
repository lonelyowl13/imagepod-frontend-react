import { apiFetch } from './api'
import type { JobRunRequest, JobRunResponse, JobResponse } from '@/types/api'

export async function runJob(
  token: string,
  endpointId: number,
  body: JobRunRequest
): Promise<JobRunResponse> {
  return apiFetch<JobRunResponse>(`/jobs/${endpointId}/run`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function getJobStatus(
  token: string,
  endpointId: number,
  jobId: number
): Promise<JobResponse> {
  return apiFetch<JobResponse>(`/jobs/${endpointId}/status/${jobId}`, { token })
}

export async function cancelJob(
  token: string,
  endpointId: number,
  jobId: number
): Promise<JobResponse> {
  return apiFetch<JobResponse>(`/jobs/${endpointId}/cancel/${jobId}`, { method: 'POST', token })
}
