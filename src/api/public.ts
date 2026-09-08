import { publicApiClient } from './client'
import type {
  PublicInvoiceView,
  CheckoutResult,
  ContributorSummary,
  Invoice,
  Receipt,
  OrgRole,
} from '@/types/api'

export function getInvoiceByToken(token: string) {
  return publicApiClient.get<PublicInvoiceView>(`/public/invoices/${token}`).then((r) => r.data)
}

export function initializeCheckout(
  token: string,
  payload: { email: string; amount?: number; contributorName?: string; contributorPhone?: string },
) {
  return publicApiClient
    .post<CheckoutResult>(`/payments/checkout/${token}`, payload)
    .then((r) => r.data)
}

export function createPledge(
  eventId: string,
  payload: {
    contributorName: string
    contributorPhone: string
    amountPledged?: number
    categoryTag?: string
  },
) {
  return publicApiClient
    .post<Invoice>(`/public/events/${eventId}/pledges`, payload)
    .then((r) => r.data)
}

export function getPublicContributors(eventId: string) {
  return publicApiClient
    .get<ContributorSummary>(`/public/events/${eventId}/contributors`)
    .then((r) => r.data)
}

export function getReceipt(reference: string) {
  return publicApiClient
    .get<Receipt>('/public/receipts', { params: { reference } })
    .then((r) => r.data)
}

export function getOrganizationInvitation(token: string) {
  return publicApiClient
    .get<{ organizationName: string; role: OrgRole; email: string }>(
      `/public/organization-invitations/${token}`,
    )
    .then((r) => r.data)
}
