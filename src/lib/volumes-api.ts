import { apiFetch } from './api'
import type {
  VolumeResponse,
  VolumeCreate,
  VolumeUpdate,
  VolumeMountRequest,
  VolumeMountResponse,
} from '@/types/api'

export async function listVolumes(token: string): Promise<VolumeResponse[]> {
  return apiFetch<VolumeResponse[]>('/volumes/', { token })
}

export async function getVolume(token: string, volumeId: number): Promise<VolumeResponse> {
  return apiFetch<VolumeResponse>(`/volumes/${volumeId}`, { token })
}

export async function createVolume(token: string, body: VolumeCreate): Promise<VolumeResponse> {
  return apiFetch<VolumeResponse>('/volumes/', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function updateVolume(
  token: string,
  volumeId: number,
  body: VolumeUpdate
): Promise<VolumeResponse> {
  return apiFetch<VolumeResponse>(`/volumes/${volumeId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  })
}

export async function deleteVolume(token: string, volumeId: number): Promise<void> {
  return apiFetch<void>(`/volumes/${volumeId}`, { method: 'DELETE', token })
}

export async function mountVolume(
  token: string,
  endpointId: number,
  body: VolumeMountRequest
): Promise<VolumeMountResponse> {
  return apiFetch<VolumeMountResponse>(`/volumes/mount/${endpointId}`, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  })
}

export async function unmountVolume(
  token: string,
  endpointId: number,
  volumeId: number
): Promise<void> {
  return apiFetch<void>(`/volumes/mount/${endpointId}/${volumeId}`, {
    method: 'DELETE',
    token,
  })
}

export async function listMounts(
  token: string,
  endpointId: number
): Promise<VolumeMountResponse[]> {
  return apiFetch<VolumeMountResponse[]>(`/volumes/mounts/${endpointId}`, { token })
}
