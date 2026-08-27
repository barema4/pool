import { apiClient } from './client'
import type { UserProfile } from '@/types/api'

export function getMe() {
  return apiClient.get<UserProfile>('/users/me').then((r) => r.data)
}

export function setPayout(payload: { bankCode: string; bankName: string; accountNumber: string }) {
  return apiClient.patch<UserProfile>('/users/me/payout', payload).then((r) => r.data)
}
