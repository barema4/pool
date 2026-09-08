import { apiClient, publicApiClient } from './client'
import type { AuthResponse } from '@/types/api'

export function register(payload: {
  email: string
  password: string
  name: string
  inviteToken?: string
}) {
  return publicApiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data)
}

export function login(payload: { email: string; password: string }) {
  return publicApiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data)
}

export function refresh(refreshToken: string) {
  return apiClient.post<AuthResponse>('/auth/refresh', { refreshToken }).then((r) => r.data)
}

export function forgotPassword(payload: { email: string }) {
  return publicApiClient
    .post<{ message: string }>('/auth/forgot-password', payload)
    .then((r) => r.data)
}

export function resetPassword(payload: { token: string; newPassword: string }) {
  return publicApiClient
    .post<{ message: string }>('/auth/reset-password', payload)
    .then((r) => r.data)
}
