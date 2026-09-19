import { apiClient } from './client'
import type { Disbursement, PaginatedResult } from '@/types/api'

export interface ListDisbursementsParams {
  eventId: string
  page?: number
  pageSize?: number
}

export function listForEvent(params: ListDisbursementsParams) {
  return apiClient
    .get<PaginatedResult<Disbursement>>('/disbursements', { params })
    .then((r) => r.data)
}
