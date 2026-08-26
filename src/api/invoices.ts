import { apiClient } from './client'
import type { Invoice, ShareLinks, ContributorSummary } from '@/types/api'

export function listForEvent(eventId: string) {
  return apiClient.get<Invoice[]>('/invoices', { params: { eventId } }).then((r) => r.data)
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
