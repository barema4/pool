import { apiClient } from './client'
import type {
  AdminDispute,
  AdminTransaction,
  DisputeStatus,
  PaginatedResult,
  TransactionStatus,
} from '@/types/api'

export function list(params?: {
  page?: number
  pageSize?: number
  search?: string
  organizationId?: string
  status?: TransactionStatus
  dateFrom?: string
  dateTo?: string
}) {
  return apiClient
    .get<PaginatedResult<AdminTransaction>>('/admin/transactions', { params })
    .then((r) => r.data)
}

export function refund(transactionId: string) {
  return apiClient.post(`/admin/transactions/${transactionId}/refund`).then((r) => r.data)
}

export function listDisputes(params?: { page?: number; pageSize?: number; status?: DisputeStatus }) {
  return apiClient
    .get<PaginatedResult<AdminDispute>>('/admin/disputes', { params })
    .then((r) => r.data)
}

export function updateDisputeStatus(
  disputeId: string,
  payload: { status: DisputeStatus; resolution?: string },
) {
  return apiClient
    .patch<AdminDispute>(`/admin/disputes/${disputeId}/status`, payload)
    .then((r) => r.data)
}
