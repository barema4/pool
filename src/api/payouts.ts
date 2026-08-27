import { apiClient } from './client'
import type { Bank } from '@/types/api'

export function listBanks() {
  return apiClient.get<Bank[]>('/payouts/banks').then((r) => r.data)
}

export function resolveAccount(payload: { bankCode: string; accountNumber: string }) {
  return apiClient
    .post<{ accountNumber: string; accountName: string }>('/payouts/resolve-account', payload)
    .then((r) => r.data)
}
