import { apiClient } from './client'
import type { MobileMoneyProvider, PlatformPayoutBalance, PlatformPayoutDestination, PlatformWithdrawal } from '@/types/api'

export function listBalances() {
  return apiClient
    .get<PlatformPayoutBalance[]>('/admin/platform-payouts/balances')
    .then((r) => r.data)
}

export function listWithdrawals() {
  return apiClient
    .get<PlatformWithdrawal[]>('/admin/platform-payouts/withdrawals')
    .then((r) => r.data)
}

export function setDestination(
  countryCode: string,
  payload: { provider: MobileMoneyProvider; phoneNumber: string },
) {
  return apiClient
    .put<PlatformPayoutDestination>(`/admin/platform-payouts/${countryCode}/destination`, payload)
    .then((r) => r.data)
}

export function requestWithdrawal(countryCode: string, amount: number) {
  return apiClient
    .post<PlatformWithdrawal>(`/admin/platform-payouts/${countryCode}/withdrawals`, { amount })
    .then((r) => r.data)
}
