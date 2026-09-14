import { apiClient } from './client'
import type {
  ContributorSummary,
  Invoice,
  InvoiceSource,
  InvoiceStatus,
  PaginatedResult,
  ShareLinks,
} from '@/types/api'

export interface ListInvoicesParams {
  eventId: string
  page?: number
  pageSize?: number
  search?: string
  status?: InvoiceStatus
  source?: InvoiceSource
  dateFrom?: string
  dateTo?: string
}

export function listForEvent(params: ListInvoicesParams) {
  return apiClient.get<PaginatedResult<Invoice>>('/invoices', { params }).then((r) => r.data)
}

// The one auto-created, non-expiring link every event gets on creation —
// always shown in its own card, independent of the paginated/filtered list
// above (which excludes it to avoid showing it twice).
export function getPrimaryLink(eventId: string) {
  return apiClient
    .get<Invoice | null>('/invoices/primary', { params: { eventId } })
    .then((r) => r.data)
}

export function create(payload: {
  eventId: string
  contributorName?: string
  contributorEmail?: string
  contributorPhone?: string
  amountRequested?: number
  categoryTag?: string
  isPermanent?: boolean
  expiresInDays?: number
}) {
  return apiClient.post<Invoice>('/invoices', payload).then((r) => r.data)
}

export function getShareLinks(invoiceId: string) {
  return apiClient.get<ShareLinks>(`/invoices/${invoiceId}/share`).then((r) => r.data)
}

export function getContributors(eventId: string) {
  return apiClient
    .get<ContributorSummary>('/invoices/contributors', { params: { eventId } })
    .then((r) => r.data)
}
