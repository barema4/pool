import { apiClient } from './client'
import type { Withdrawal, WithdrawalSummary } from '@/types/api'

export function listForOrganization(organizationId: string) {
  return apiClient
    .get<WithdrawalSummary>(`/organizations/${organizationId}/withdrawals`)
    .then((r) => r.data)
}

export function create(organizationId: string, payload: { amount: number }) {
  return apiClient
    .post<Withdrawal>(`/organizations/${organizationId}/withdrawals`, payload)
    .then((r) => r.data)
}
