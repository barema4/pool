import { apiClient } from './client'
import type { UserProfile } from '@/types/api'

export function getMe() {
  return apiClient.get<UserProfile>('/users/me').then((r) => r.data)
}

export function setPayout(payload: { bankCode: string; bankName: string; accountNumber: string }) {
  return apiClient.patch<UserProfile>('/users/me/payout', payload).then((r) => r.data)
}

export function updateProfile(payload: { name?: string; email?: string }) {
  return apiClient.patch<UserProfile>('/users/me', payload).then((r) => r.data)
}

export function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return apiClient
    .patch<{ message: string }>('/users/me/password', payload)
    .then((r) => r.data)
}
