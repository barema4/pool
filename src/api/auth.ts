import { apiClient, publicApiClient } from './client'
import type { AuthResponse } from '@/types/api'

export function register(payload: { email: string; password: string; name: string }) {
  return publicApiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data)
}

export function login(payload: { email: string; password: string }) {
  return publicApiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data)
}

export function refresh(refreshToken: string) {
  return apiClient.post<AuthResponse>('/auth/refresh', { refreshToken }).then((r) => r.data)
}
