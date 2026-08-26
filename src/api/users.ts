import { apiClient } from './client'
import type { UserProfile } from '@/types/api'

export function getMe() {
  return apiClient.get<UserProfile>('/users/me').then((r) => r.data)
}

export function updateMe(payload: { gatewayWalletId?: string }) {
  return apiClient.patch<UserProfile>('/users/me', payload).then((r) => r.data)
}
