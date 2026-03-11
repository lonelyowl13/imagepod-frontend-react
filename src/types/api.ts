/* Types derived from OpenAPI spec */

export interface UserResponse {
  id: number
  username: string
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type?: string
}

export interface RegisterRequest {
  username: string
  password: string
  password2: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  new_password2: string
}

export interface ApiKey {
  id: number
  api_key: string
}

export interface ApiKeyMetadata {
  id: number
  created_at: string
}

export interface KeyList {
  keys: ApiKeyMetadata[]
}

export interface TemplateResponse {
  id: number
  name: string
  image_name: string
  docker_entrypoint: string[]
  docker_start_cmd: string[]
  env: Record<string, string>
  is_serverless: boolean
}

export interface TemplateCreate {
  name: string
  image_name: string
  docker_entrypoint?: string[] | null
  docker_start_cmd?: string[] | null
  env?: Record<string, string> | null
  is_serverless?: boolean
}

export interface TemplateUpdate {
  name?: string | null
  image_name?: string | null
  docker_entrypoint?: string[] | null
  docker_start_cmd?: string[] | null
  env?: Record<string, string> | null
  is_serverless?: boolean | null
}

export interface ExecutorResponse {
  id: number
  name?: string | null
  gpu_type?: string | null
  gpu_count: number
  cuda_version?: string | null
  compute_type: string
  is_active: boolean
}

export interface ExecutorSummary {
  id: number
  name?: string | null
  compute_type?: string | null
  is_active: boolean
  created_at: string
  gpu?: string | null
  cpu?: string | null
  ram?: number | null
  vram?: number | null
  last_heartbeat?: string | null
  is_shared?: boolean
  owner?: string | null
}

export interface ExecutorAddRequest {
  name: string
}

export interface ExecutorAddResponse {
  api_key: string
  executor_id: number
}

export interface ExecutorShareRequest {
  username: string
}

export interface ExecutorShareResponse {
  executor_id: number
  username: string
}

export interface EndpointResponse {
  id: number
  name: string
  compute_type: string
  executor_id: number
  execution_timeout_ms: number
  idle_timeout: number
  template_id: number
  vcpu_count: number
  env?: Record<string, string>
  version: number
  status: string
  created_at: string
  template: TemplateResponse
  executor: ExecutorResponse
  volumes?: EndpointVolumeInfo[]
  user_id: number
}

export interface EndpointCreate {
  name: string
  template_id: number
  executor_id: number
  compute_type?: string
  execution_timeout_ms?: number
  idle_timeout?: number
  vcpu_count?: number
}

export interface EndpointUpdate {
  name?: string | null
  template_id?: number | null
  executor_id?: number | null
  compute_type?: string | null
  execution_timeout_ms?: number | null
  idle_timeout?: number | null
  vcpu_count?: number | null
  version?: number | null
  env?: Record<string, string> | null
}

export interface JobRunRequest {
  input: Record<string, unknown>
}

export interface JobRunResponse {
  id: number
  status: string
}

export interface JobResponse {
  id: number
  delay_time: number
  execution_time: number
  output: Record<string, unknown> | null
  input: Record<string, unknown>
  status: string
  endpoint_id: number
  executor_id: number
  stream?: unknown[] | null
}

export interface EndpointVolumeInfo {
  volume_id: number
  name: string
  mount_path: string
  size_gb?: number | null
}

export interface VolumeResponse {
  id: number
  name: string
  executor_id: number
  size_gb?: number | null
  created_at: string
}

export interface VolumeCreate {
  name: string
  executor_id: number
  size_gb?: number | null
}

export interface VolumeUpdate {
  name?: string | null
  size_gb?: number | null
}

export interface VolumeMountRequest {
  volume_id: number
  mount_path?: string
}

export interface VolumeMountResponse {
  id: number
  volume_id: number
  endpoint_id: number
  mount_path: string
  volume: VolumeResponse
}

export type PodStatus = 'RUNNING' | 'STOPPED' | 'TERMINATED'

export interface PodResponse {
  id: number
  name: string
  compute_type: string
  executor_id: number
  template_id: number
  vcpu_count: number
  env?: Record<string, string>
  ports?: number[]
  status: PodStatus
  created_at: string
  last_started_at: string | null
  last_stopped_at: string | null
  template: TemplateResponse
  executor: ExecutorResponse
  user_id: number
}

export interface PodCreate {
  name: string
  template_id: number
  executor_id: number
  compute_type?: string
  vcpu_count?: number
  ports?: number[]
  env?: Record<string, string> | null
}

export interface PodUpdate {
  name?: string | null
  template_id?: number | null
  executor_id?: number | null
  compute_type?: string | null
  vcpu_count?: number | null
  ports?: number[] | null
  env?: Record<string, string> | null
}

export interface HTTPValidationError {
  detail?: Array<{ loc: (string | number)[]; msg: string; type: string }>
}
