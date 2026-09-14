import { apiClient } from './client'
import type { PaginatedResult, PaymentRail, Transaction, TransactionStatus } from '@/types/api'

export interface ListTransactionsParams {
  eventId: string
  page?: number
  pageSize?: number
  search?: string
  status?: TransactionStatus
  paymentRail?: PaymentRail
  dateFrom?: string
  dateTo?: string
}

export function listForEvent(params: ListTransactionsParams) {
  return apiClient
    .get<PaginatedResult<Transaction>>('/transactions', { params })
    .then((r) => r.data)
}

export function recordManual(payload: { eventId: string; amount: number; note?: string }) {
  return apiClient.post<Transaction>('/transactions/manual', payload).then((r) => r.data)
}

export function refund(transactionId: string) {
  return apiClient.post(`/transactions/${transactionId}/refund`).then((r) => r.data)
}
