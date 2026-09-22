import { apiClient } from './client'
import type { BillingStatus } from '@/types/api'

export function getStatus(organizationId: string) {
  return apiClient.get<BillingStatus>(`/organizations/${organizationId}/billing`).then((r) => r.data)
}

export function createCheckoutSession(organizationId: string) {
  return apiClient
    .post<{ url: string }>(`/organizations/${organizationId}/billing/checkout-session`)
    .then((r) => r.data)
}

export function createPortalSession(organizationId: string) {
  return apiClient
    .post<{ url: string }>(`/organizations/${organizationId}/billing/portal-session`)
    .then((r) => r.data)
}
