import { apiClient } from './client'
import type { Transaction } from '@/types/api'

export function listForEvent(eventId: string) {
  return apiClient.get<Transaction[]>('/transactions', { params: { eventId } }).then((r) => r.data)
}

export function recordManual(payload: { eventId: string; amount: number; note?: string }) {
  return apiClient.post<Transaction>('/transactions/manual', payload).then((r) => r.data)
}

export function refund(transactionId: string) {
  return apiClient.post(`/transactions/${transactionId}/refund`).then((r) => r.data)
}
